# Security headers and CSP (SPA)

The built SPA is served by nginx from its own image. This describes the headers
that image sends, and the one trap in nginx that makes them easy to lose.

The API sends its own, stricter, set — see
[`backend/docs/security-headers.md`](../../backend/docs/security-headers.md).
The two are separate origins and neither policy covers the other.

## Where the policy lives

`docker-entrypoint.d/30-csp.sh`, which writes
`/etc/nginx/snippets/security-headers.conf` before nginx starts. It is a script
rather than a static file because three of the CSP's sources are deployment
facts, not code facts: where the API is, where object storage is, and whether
either is HTTPS.

`nginx-security-headers.default.conf` is baked into the image as a fallback, so
a container whose entrypoint is overridden still starts **with** a policy rather
than without one. Its origins are the local-development defaults.

## Configuration

| Variable | Default | Effect |
|---|---|---|
| `API_ORIGIN` | `http://localhost:3000` | Added to `connect-src`. The WebSocket origin is **derived** from it (`https:`→`wss:`), so Socket.IO cannot be forgotten. |
| `STORAGE_ORIGIN` | `http://localhost:9000` | Added to `img-src`, `connect-src` and `object-src` — MinIO / S3 serves avatars, covers and every document byte. |
| `CSP_ALLOW_OFFICE_VIEWER` | allowed | `false` drops `https://view.officeapps.live.com` from `object-src`, disabling the Office Online fallback. |
| `CSP_REPORT_ONLY` | `false` | `true` sends `Content-Security-Policy-Report-Only` — violations are logged by the browser, nothing is blocked. |
| `CSP_REPORT_URI` | — | Adds `report-uri`. |
| `CSP_EXTRA` | — | Appended verbatim. The escape hatch. |

A malformed origin **aborts startup** with a message rather than producing a
policy that silently allows the wrong thing.

## The policy, and why each source is there

```
default-src 'none';
script-src  'self';
style-src   'self';
img-src     'self' data: blob: <storage>;
font-src    'self' data:;
connect-src 'self' <api> <ws> <storage>;
worker-src  'self' blob:;
object-src  'self' <storage> <office-viewer>;
base-uri    'none';
form-action 'self';
frame-ancestors 'none';
```

- **`script-src 'self'` with no `'unsafe-inline'` and no nonce.** Vite's built
  `index.html` contains one external module script and nothing inline, so
  nothing needs to be excused. This is the directive that makes the policy worth
  having.
- **`style-src 'self'` with no `'unsafe-inline'`.** All CSS is a build-time
  stylesheet. pdf.js does append a `<style>` element, but leaves it empty and
  fills it through CSSOM `insertRule`, which CSP does not govern; Vue's `:style`
  bindings go through CSSOM too. Static `style="…"` attributes written into
  `index.html` by hand *would* break this.
- **`img-src data:`** for an inline SVG in the preview modal, **`blob:`** for the
  local preview of a file the user just picked, **`<storage>`** for avatars and
  covers.
- **`font-src data:`** is pdf.js's fallback for fonts embedded in a PDF.
- **`connect-src <storage>`** because pdf.js fetches PDF bytes straight from the
  presigned URL — a policy covering only the API blocks every document preview.
- **`worker-src 'self'`** for the pdf.js worker, which Vite emits as a hashed
  same-origin asset. `blob:` covers pdf.js's wrapper path if the worker ever
  moves cross-origin.
- **`object-src`, not `frame-src`.** Document previews are
  `<object type="application/pdf">`, so they are governed by `object-src`. The
  usual `object-src 'none'` hardening would break every preview in the app.
  `'self'` is safe here: this origin serves only the static build, and every
  upload lives in storage.
- **No `frame-src`, `media-src` or `manifest-src`** — they fall through to
  `default-src 'none'`, which is correct: the app frames nothing and has no
  manifest.
- **`upgrade-insecure-requests`** is added automatically, and only when the API
  and storage origins are *both* already HTTPS. Switching it on while either is
  HTTP would rewrite requests to a port that is not listening.

### If you add a feature

Adding an embedded map, an analytics script, a CDN font or a third-party iframe
means adding a source here. The failure is loud and specific — the browser
console names the directive — so the fix is usually one line in the script.
`'unsafe-inline'` in `script-src` is the one change that would make the policy
decorative; prefer a hash or a nonce.

## The nginx trap

> There could be several `add_header` directives. These directives are inherited
> from the previous configuration level **if and only if there are no
> `add_header` directives defined on the current level.**

So a single `add_header Cache-Control …` inside a `location` silently drops
every security header the `server` block set. Before this change, that is
exactly what happened to `/assets/` and to `= /index.html` — the app shell, the
one response a CSP exists to protect, was the one response that never carried a
security header.

Every block that sets an `add_header` of its own therefore `include`s the
snippet. `/healthz` sets `default_type` instead of an `add_header`, so it needs
no include and inherits normally.

**When adding a `location` that sets any header, add the include too.** The
symptom of forgetting is not an error; it is a response that quietly has no
policy.

## Rolling it out

Run one deploy with `CSP_REPORT_ONLY=true` first. The policy above is derived
from what the bundle actually loads, but "derived from the bundle" is not the
same as "watched in a browser". Open the pages that exercise the awkward paths —
a PDF preview, an Office document, an avatar upload, the notification bell —
and read the console. Anything that appears is either a missing source or a real
finding; either way it is better seen in a report than in a support message.

Then drop the variable.

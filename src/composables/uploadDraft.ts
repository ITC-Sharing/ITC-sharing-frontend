/**
 * In-flight form drafts, kept only for this page session.
 *
 * Module scope, deliberately: a draft outlives its modal being closed and
 * reopened — the point is that a stray click on the backdrop costs nothing —
 * but a page reload starts over. Nothing is written to storage.
 *
 * Drafts are keyed by `context`, whatever identifies where one was started (a
 * modal locks its department/year/subject from the page it opened on). A draft
 * is only handed back to the same context, and separate forms — an upload and a
 * new subject, say — never overwrite each other.
 */
const drafts = new Map<string, unknown>()

export function readDraft<T>(context: string): T | null {
  return (drafts.get(context) as T | undefined) ?? null
}

export function writeDraft(context: string, value: unknown) {
  drafts.set(context, value)
}

export function clearDraft(context: string) {
  drafts.delete(context)
}

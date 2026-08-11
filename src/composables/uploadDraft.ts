/**
 * What the upload form had in it, kept only for this page session.
 *
 * Module scope, deliberately: the draft outlives the modal being closed and
 * reopened — the point is that a stray click on the backdrop costs nothing —
 * but a page reload starts over. Nothing is written to storage.
 *
 * `context` is whatever identifies where the draft was started (the modal locks
 * its department/year/subject from the page it opened on); a draft is only
 * handed back to the same context.
 */
let draft: unknown = null
let draftContext = ''

export function readDraft<T>(context: string): T | null {
  return draft !== null && draftContext === context ? (draft as T) : null
}

export function writeDraft(context: string, value: unknown) {
  draft = value
  draftContext = context
}

export function clearDraft() {
  draft = null
  draftContext = ''
}

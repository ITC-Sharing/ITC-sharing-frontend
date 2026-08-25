import { clearDraft, readDraft, writeDraft } from './uploadDraft'

/**
 * Draft of the "new subject" form. Shares the session draft store with the
 * upload form; the `subject:` prefix keeps the two apart.
 *
 * The cover image is held as the File itself — this store is memory, not
 * storage, so there is nothing to serialise. Its preview URL is not kept: the
 * modal makes a fresh one on restore, so a revoked URL can never be reused.
 */
export type SubjectDraft = {
  name: string
  departmentId: string
  academicYear: string
  semester: string
  image: File | null
}

export function subjectDraftContext(majorId: string, yearLevel: number | string) {
  return `subject:${majorId}|${yearLevel}`
}

export function readSubjectDraft(context: string) {
  return readDraft<SubjectDraft>(context)
}

export function writeSubjectDraft(context: string, draft: SubjectDraft) {
  writeDraft(context, draft)
}

export function clearSubjectDraft(context: string) {
  clearDraft(context)
}

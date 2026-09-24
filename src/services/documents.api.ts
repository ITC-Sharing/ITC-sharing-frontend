// Transport only: one function per endpoint, returning the response body.
// Loading flags, error handling and any reshaping stay in the store.
import api from './http'
import type { DocumentStats, MyUpload, Upload } from '@/types/documents.types'

/** Progress callback shape shared by the multipart uploads below. */
type OnProgress = (percent: number) => void

const progressConfig = (onProgress?: OnProgress) => ({
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (e: { loaded: number; total?: number }) => {
    if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
  },
})

export function fetchDocTypes() {
  return api.get('/documents/types').then((r) => r.data)
}

export function fetchDocuments(params: Record<string, unknown>) {
  return api.get<{ items: Upload[]; total: number }>('/documents', { params }).then((r) => r.data)
}

export function fetchDocument(uploadId: string) {
  return api.get<Upload>(`/documents/${uploadId}`).then((r) => r.data)
}

/** Takes the already-built FormData — assembling it stays in the store. */
export function stageFile(formData: FormData, onProgress?: OnProgress) {
  return api
    .post('/documents/staged-files', formData, progressConfig(onProgress))
    .then((r) => r.data)
}

export function deleteStagedFile(id: string) {
  return api.delete(`/documents/staged-files/${id}`)
}

export function createUpload(formData: FormData, onProgress?: OnProgress) {
  return api.post('/documents', formData, progressConfig(onProgress)).then((r) => r.data)
}

export function fetchDocumentStats() {
  return api.get<DocumentStats>('/documents/stats').then((r) => r.data)
}

export function fetchMyUploads() {
  return api.get<MyUpload[]>('/documents/mine').then((r) => r.data)
}

export function updateDocument(uploadId: string, payload: Record<string, unknown>) {
  return api.patch(`/documents/${uploadId}`, payload).then((r) => r.data)
}

export function addFiles(uploadId: string, formData: FormData, onProgress?: OnProgress) {
  return api
    .post<{
      files: unknown[]
      needs_review: boolean
    }>(`/documents/${uploadId}/files`, formData, progressConfig(onProgress))
    .then((r) => r.data)
}

/**
 * A short-lived, authorised URL for one file.
 *
 * The documents bucket is private, so a stored URL is not an address any more —
 * the API mints a signed link per request, after re-checking that this viewer
 * may see the file. Called at click time rather than render time so the link is
 * always fresh; URLs embedded in list responses expire in a few minutes.
 */
export function fileAccessUrl(fileId: string, variant: 'download' | 'preview') {
  return api
    .get<{
      url: string
      expires_in: number
      original_name: string | null
    }>(`/documents/files/${fileId}/${variant}`)
    .then((r) => r.data)
}

export function addStagedFiles(uploadId: string, stagedFileIds: string[]) {
  return api
    .post(`/documents/${uploadId}/files`, { staged_file_ids: stagedFileIds })
    .then((r) => r.data)
}

export function removeFile(fileId: string) {
  return api
    .delete<{
      message: string
      upload_deleted: boolean
      upload_id: string
    }>(`/documents/files/${fileId}`)
    .then((r) => r.data)
}

export function setFileHidden(fileId: string, hidden: boolean) {
  return api
    .patch<{
      message: string
      hidden: boolean
      upload_hidden: boolean
      upload_id: string
    }>(`/documents/files/${fileId}/hidden`, { hidden })
    .then((r) => r.data)
}

export function setPinned(uploadId: string, pinned: boolean) {
  return api
    .patch<{ message: string; pinned: boolean }>(`/documents/${uploadId}/pinned`, { pinned })
    .then((r) => r.data)
}

export function setHidden(uploadId: string, hidden: boolean) {
  return api
    .patch<{ message: string; hidden: boolean }>(`/documents/${uploadId}/hidden`, { hidden })
    .then((r) => r.data)
}

export function deleteUpload(uploadId: string) {
  return api.delete(`/documents/${uploadId}`)
}

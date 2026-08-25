import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'
import type { AudienceEntry, DocumentStats, MyUpload, Upload } from '@/types'

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref<Upload[]>([])
  const total = ref(0)
  const currentUpload = ref<Upload | null>(null)
  const myUploads = ref<MyUpload[]>([])
  const stats = ref<DocumentStats>({ total: 0, size_kb: 0 })
  // Every type, plus the subset each kind of course offers — a department doc
  // and a language (DFL) doc are asked for different things.
  const docTypes = ref<string[]>([])
  const departmentDocTypes = ref<string[]>([])
  const languageDocTypes = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDocTypes() {
    try {
      const { data } = await api.get('/documents/types')
      docTypes.value = data.types as string[]
      departmentDocTypes.value = (data.department ?? data.types) as string[]
      languageDocTypes.value = (data.language ?? data.types) as string[]
    } catch {
      // keep empty; modal falls back gracefully
    }
  }

  async function fetchAll(filters: {
    major_id?: string
    subject_id?: string
    doc_type?: string
    search?: string
    title?: string
    uploader_id?: string
    year_level?: number
    page?: number
    limit?: number
  }) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<{ items: Upload[]; total: number }>('/documents', {
        params: filters,
      })
      documents.value = data.items
      total.value = data.total
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load documents'
    } finally {
      loading.value = false
    }
  }

  // Fetch a single upload with all its files
  async function fetchOne(uploadId: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<Upload>(`/documents/${uploadId}`)
      currentUpload.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load document'
    } finally {
      loading.value = false
    }
  }

  /**
   * Send one file ahead of the metadata. The upload form calls this as soon as
   * a file is picked, so the transfer runs while the user fills in the rest;
   * the returned id is passed back as `staged_file_ids` on submit.
   */
  async function stageFile(file: File, onProgress?: (percent: number) => void) {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/documents/staged-files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
    return data as {
      id: string
      file_url: string
      preview_url: string | null
      original_name: string | null
      file_size_kb: number | null
    }
  }

  /** Discard a staged file the user removed from the form. */
  async function deleteStagedFile(id: string) {
    await api.delete(`/documents/staged-files/${id}`)
  }

  async function upload(formData: FormData, onProgress?: (percent: number) => void) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      return data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Upload failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Dashboard totals, aggregated server-side. Kept separate from `documents`
  // so a paginated list never distorts the numbers.
  async function fetchStats() {
    try {
      const { data } = await api.get<DocumentStats>('/documents/stats')
      stats.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load document stats'
    }
  }

  async function fetchMine() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<MyUpload[]>('/documents/mine')
      myUploads.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load your uploads'
    } finally {
      loading.value = false
    }
  }

  async function updateDocument(
    uploadId: string,
    payload: {
      title?: string
      doc_type?: string
      year_level?: number
      academic_year?: string
      major_id?: string
      subject_id?: string | null
      audience?: AudienceEntry[]
      expires_at?: string | null
      description?: string | null
    },
  ) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.patch(`/documents/${uploadId}`, payload)
      return data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Update failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Attach files to an existing upload. `needs_review` comes back true when the
   * upload was already approved: the new files land hidden until a moderator
   * clears them, while the document itself stays in the feed.
   */
  async function addFiles(
    uploadId: string,
    files: File[],
    onProgress?: (percent: number) => void,
  ) {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    const { data } = await api.post<{
      files: unknown[]
      needs_review: boolean
    }>(`/documents/${uploadId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
    return data
  }

  /** Attach files that were staged while the edit form was open. */
  async function addStagedFiles(uploadId: string, stagedFileIds: string[]) {
    const { data } = await api.post(`/documents/${uploadId}/files`, {
      staged_file_ids: stagedFileIds,
    })
    return data
  }

  /**
   * Remove one file from an upload. Removing the last one deletes the upload
   * server-side, so the reply is echoed back — callers navigate away on
   * `upload_deleted` rather than refetching an upload that is gone.
   */
  async function removeFile(fileId: string) {
    const { data } = await api.delete<{
      message: string
      upload_deleted: boolean
      upload_id: string
    }>(`/documents/files/${fileId}`)

    if (data.upload_deleted) {
      documents.value = documents.value.filter((d) => d.id !== data.upload_id)
      if (currentUpload.value?.id === data.upload_id) currentUpload.value = null
    } else if (currentUpload.value?.id === data.upload_id) {
      currentUpload.value = {
        ...currentUpload.value,
        documents: currentUpload.value.documents.filter((f) => f.id !== fileId),
      }
    }

    return data
  }

  async function deleteDocument(uploadId: string) {
    await api.delete(`/documents/${uploadId}`)
    documents.value = documents.value.filter((d) => d.id !== uploadId)
  }

  return {
    documents,
    total,
    currentUpload,
    myUploads,
    stats,
    docTypes,
    departmentDocTypes,
    languageDocTypes,
    loading,
    error,
    fetchDocTypes,
    stageFile,
    deleteStagedFile,
    fetchAll,
    fetchOne,
    fetchStats,
    fetchMine,
    upload,
    updateDocument,
    addFiles,
    addStagedFiles,
    removeFile,
    deleteDocument,
  }
})

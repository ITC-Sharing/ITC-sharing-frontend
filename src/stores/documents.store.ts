import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref<any[]>([])
  const total = ref(0)
  const currentUpload = ref<any | null>(null)
  const myUploads = ref<any[]>([])
  const docTypes = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDocTypes() {
    try {
      const { data } = await api.get('/documents/types')
      docTypes.value = data.types as string[]
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
      const { data } = await api.get('/documents', { params: filters })
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
      const { data } = await api.get(`/documents/${uploadId}`)
      currentUpload.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load document'
    } finally {
      loading.value = false
    }
  }

  async function upload(formData: FormData) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Upload failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Track download on a specific file (document row id, not upload id)
  async function trackDownload(fileId: string) {
    await api.patch(`/documents/${fileId}/download`)
  }

  async function fetchMine() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/documents/mine')
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
      tags?: string[]
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

  async function addFiles(uploadId: string, files: File[]) {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    const { data } = await api.post(`/documents/${uploadId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async function removeFile(fileId: string) {
    await api.delete(`/documents/files/${fileId}`)
  }

  async function deleteDocument(uploadId: string) {
    await api.delete(`/documents/${uploadId}`)
    documents.value = documents.value.filter((d: any) => d.id !== uploadId)
  }

  return {
    documents,
    total,
    currentUpload,
    myUploads,
    docTypes,
    loading,
    error,
    fetchDocTypes,
    fetchAll,
    fetchOne,
    fetchMine,
    upload,
    trackDownload,
    updateDocument,
    addFiles,
    removeFile,
    deleteDocument,
  }
})

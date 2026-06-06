import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref<any[]>([])
  const currentUpload = ref<any | null>(null)
  const myUploads = ref<any[]>([])
  const saved = ref<any[]>([])
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
  }) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/documents', { params: filters })
      documents.value = data
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

  async function fetchSaved() {
    const { data } = await api.get('/documents/saved')
    saved.value = data
  }

  async function saveDocument(uploadId: string) {
    await api.post(`/documents/${uploadId}/save`)
  }

  async function unsaveDocument(uploadId: string) {
    await api.delete(`/documents/${uploadId}/save`)
  }

  async function deleteDocument(uploadId: string) {
    await api.delete(`/documents/${uploadId}`)
    documents.value = documents.value.filter((d: any) => d.id !== uploadId)
  }

  return {
    documents,
    currentUpload,
    myUploads,
    saved,
    docTypes,
    loading,
    error,
    fetchDocTypes,
    fetchAll,
    fetchOne,
    fetchMine,
    upload,
    trackDownload,
    fetchSaved,
    saveDocument,
    unsaveDocument,
    deleteDocument,
  }
})

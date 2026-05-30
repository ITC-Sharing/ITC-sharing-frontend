import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref<any[]>([])
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
    group_id?: string
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

  async function trackDownload(id: string) {
    await api.patch(`/documents/${id}/download`)
  }

  async function fetchSaved() {
    const { data } = await api.get('/documents/saved')
    saved.value = data
  }

  async function saveDocument(id: string) {
    await api.post(`/documents/${id}/save`)
  }

  async function unsaveDocument(id: string) {
    await api.delete(`/documents/${id}/save`)
  }

  async function deleteDocument(id: string) {
    await api.delete(`/documents/${id}`)
    documents.value = documents.value.filter((d: any) => d.id !== id)
  }

  return {
    documents,
    saved,
    docTypes,
    loading,
    error,
    fetchDocTypes,
    fetchAll,
    upload,
    trackDownload,
    fetchSaved,
    saveDocument,
    unsaveDocument,
    deleteDocument,
  }
})

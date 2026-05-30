import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'

export const useSubjectsStore = defineStore('subjects', () => {
  const subjects = ref<any[]>([])
  const countsByYear = ref<Record<number, number>>({})
  const loading = ref(false)
  const creating = ref(false)
  const error = ref<string | null>(null)
  const createError = ref<string | null>(null)

  async function fetchByMajorAndYear(
    majorId: string,
    yearLevel: number,
    options: { semester?: number; search?: string } = {},
  ) {
    if (!majorId) return
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string | number> = { major_id: majorId, year_level: yearLevel }
      if (options.semester) params.semester = options.semester
      if (options.search?.trim()) params.search = options.search.trim()
      const { data } = await api.get('/subjects', { params })
      subjects.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load subjects'
    } finally {
      loading.value = false
    }
  }

  async function fetchCountsByMajor(majorId: string) {
    if (!majorId) return
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/subjects/counts', { params: { major_id: majorId } })
      countsByYear.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load subject counts'
      countsByYear.value = {}
    } finally {
      loading.value = false
    }
  }

  async function createSubject(payload: {
    major_id: string
    name: string
    slug: string
    year_level: number
    semester: number
    image?: File | null
  }) {
    creating.value = true
    createError.value = null

    try {
      const formData = new FormData()
      formData.append('major_id', payload.major_id)
      formData.append('name', payload.name)
      formData.append('slug', payload.slug)
      formData.append('year_level', String(payload.year_level))
      formData.append('semester', String(payload.semester))
      if (payload.image) {
        formData.append('image', payload.image)
      }

      const { data } = await api.post('/subjects', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      return data
    } catch (e: any) {
      const msg = e.response?.data?.message
      createError.value = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create subject')
      throw e
    } finally {
      creating.value = false
    }
  }

  return {
    subjects,
    loading,
    creating,
    error,
    createError,
    fetchByMajorAndYear,
    fetchCountsByMajor,
    createSubject,
    countsByYear,
  }
})

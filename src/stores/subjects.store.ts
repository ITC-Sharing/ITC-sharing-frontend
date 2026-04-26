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

  async function fetchByMajorAndYear(majorId: string, yearLevel: number) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/subjects', {
        params: { major_id: majorId, year_level: yearLevel },
      })
      subjects.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load subjects'
    } finally {
      loading.value = false
    }
  }

  async function fetchCountsByMajor(majorId: string) {
    loading.value = true
    error.value = null

    try {
      const { data } = await api.get('/subjects', {
        params: { major_id: majorId },
      })

      const nextCounts: Record<number, number> = {}
      for (const subject of data ?? []) {
        const year = Number(subject?.year_level)
        if (!Number.isInteger(year) || year < 1) {
          continue
        }
        nextCounts[year] = (nextCounts[year] ?? 0) + 1
      }

      countsByYear.value = nextCounts
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
      createError.value = e.response?.data?.message ?? 'Failed to create subject'
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

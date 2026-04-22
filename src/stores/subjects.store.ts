import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'

export const useSubjectsStore = defineStore('subjects', () => {
  const subjects = ref<any[]>([])
  const countsByYear = ref<Record<number, number>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

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
  

  return { subjects, loading, error, fetchByMajorAndYear, countsByYear }
})

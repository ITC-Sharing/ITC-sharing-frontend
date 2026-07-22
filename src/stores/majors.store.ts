import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'
import type { Major } from '@/types'

export const useMajorsStore = defineStore('majors', () => {
  const majors = ref<Major[]>([])
  const loading = ref(false)

  async function fetchMajors() {
    loading.value = true
    try {
      const { data } = await api.get<Major[]>('/majors')
      majors.value = data
    } finally {
      loading.value = false
    }
  }

  return { majors, loading, fetchMajors }
})
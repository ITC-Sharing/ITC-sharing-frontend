import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'

export const useMajorsStore = defineStore('majors', () => {
  const majors = ref<any[]>([])
  const loading = ref(false)

  async function fetchMajors() {
    loading.value = true
    try {
      const { data } = await api.get('/majors')
      majors.value = data
    } finally {
      loading.value = false
    }
  }

  return { majors, loading, fetchMajors }
})
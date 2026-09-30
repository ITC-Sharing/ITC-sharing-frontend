import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as majorsApi from '@/services/majors.api'
import type { Major } from '@/types/major.types'
export const useMajorsStore = defineStore('majors', () => {
  const majors = ref<Major[]>([])
  const loading = ref(false)

  async function fetchMajors() {
    loading.value = true
    try {
      const data = await majorsApi.fetchMajors()
      majors.value = data
    } finally {
      loading.value = false
    }
  }

  return { majors, loading, fetchMajors }
})

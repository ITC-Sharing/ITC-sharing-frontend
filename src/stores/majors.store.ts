import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'

export const useMajorsStore = defineStore('majors', () => {
  const majors = ref<any[]>([])
  const subjects = ref<any[]>([])
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

  async function fetchSubjects(majorId: string) {
    loading.value = true
    try {
      const { data } = await api.get('/subjects', { params: { major_id: majorId } })
      subjects.value = data
    } finally {
      loading.value = false
    }
  }

  return { majors, subjects, loading, fetchMajors, fetchSubjects }
})
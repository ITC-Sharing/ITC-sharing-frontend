import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'

export const useMajorsStore = defineStore('majors', () => {
  const majors = ref([])
  const subjects = ref([])

  async function fetchMajors() {
    const { data } = await api.get('/majors')
    majors.value = data
  }

  async function fetchSubjects(majorId: string) {
    const { data } = await api.get('/subjects', { params: { major_id: majorId } })
    subjects.value = data
  }

  return { majors, subjects, fetchMajors, fetchSubjects }
})
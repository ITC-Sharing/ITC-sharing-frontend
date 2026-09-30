import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as subjectsApi from '@/services/subjects.api'
import type { MySubject, Subject } from '@/types/subjects.types'
import { apiErrorMessage } from '@/utils/api-error'
export const useSubjectsStore = defineStore('subjects', () => {
  const subjects = ref<Subject[]>([])
  const mySubjects = ref<MySubject[]>([])
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
      const data = await subjectsApi.fetchSubjects(params)
      subjects.value = data
    } catch (e: unknown) {
      error.value = apiErrorMessage(e, 'Failed to load subjects')
    } finally {
      loading.value = false
    }
  }

  async function fetchCountsByMajor(majorId: string) {
    if (!majorId) return
    loading.value = true
    error.value = null
    try {
      const data = await subjectsApi.fetchSubjectCounts(majorId)
      countsByYear.value = data
    } catch (e: unknown) {
      error.value = apiErrorMessage(e, 'Failed to load subject counts')
      countsByYear.value = {}
    } finally {
      loading.value = false
    }
  }

  async function fetchMine() {
    loading.value = true
    error.value = null
    try {
      const data = await subjectsApi.fetchMySubjects()
      mySubjects.value = data
    } catch (e: unknown) {
      error.value = apiErrorMessage(e, 'Failed to load your subjects')
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
      // No acronym: the API derives it from the name.
      formData.append('year_level', String(payload.year_level))
      formData.append('semester', String(payload.semester))
      if (payload.image) {
        formData.append('image', payload.image)
      }

      const data = await subjectsApi.createSubject(formData)

      return data
    } catch (e: unknown) {
      createError.value = apiErrorMessage(e, 'Failed to create subject')
      throw e
    } finally {
      creating.value = false
    }
  }

  return {
    subjects,
    mySubjects,
    loading,
    creating,
    error,
    createError,
    fetchByMajorAndYear,
    fetchCountsByMajor,
    fetchMine,
    createSubject,
    countsByYear,
  }
})

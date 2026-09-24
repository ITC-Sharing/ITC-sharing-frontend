// Transport only: one function per endpoint, returning the response body.
// Loading flags, error handling and any reshaping stay in the store.
import api from './http'
import type { MySubject, Subject } from '@/types/subjects.types'

export function fetchSubjects(params: Record<string, string | number>) {
  return api.get<Subject[]>('/subjects', { params }).then((r) => r.data)
}

export function fetchSubjectCounts(majorId: string) {
  return api
    .get<Record<number, number>>('/subjects/counts', { params: { major_id: majorId } })
    .then((r) => r.data)
}

export function fetchMySubjects() {
  return api.get<MySubject[]>('/subjects/mine').then((r) => r.data)
}

/** Takes the already-built FormData — assembling it stays in the store. */
export function createSubject(formData: FormData) {
  return api
    .post('/subjects', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data)
}

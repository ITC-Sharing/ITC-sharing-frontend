// Transport only: one function per endpoint, returning the response body.
// Loading flags, error handling and any reshaping stay in the store.
import api from './http'
import type { Major } from '@/types/major.types'

export function fetchMajors() {
  return api.get<Major[]>('/majors').then((r) => r.data)
}

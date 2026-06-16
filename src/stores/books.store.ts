import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'

export const useBooksStore = defineStore('books', () => {
  const books = ref<any[]>([])
  const currentBook = ref<any | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const incomingRequests = ref<any[]>([])
  const myBooks = ref<any[]>([])
  const outgoingRequests = ref<any[]>([])

  async function fetchAll(majorId?: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/books', { params: majorId ? { major_id: majorId } : {} })
      books.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load books'
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get(`/books/${id}`)
      currentBook.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load book'
    } finally {
      loading.value = false
    }
  }

  async function uploadCover(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/books/upload-cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.url as string
  }

  async function donate(payload: {
    title: string
    department: string
    description?: string
    contact?: string
    cover_image_url?: string
  }) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/books', payload)
      books.value.unshift(data)
      return data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to list book'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(bookId: string) {
    await api.delete(`/books/${bookId}`)
    books.value = books.value.filter((b) => b.id !== bookId)
  }

  // ── Book requests ─────────────────────────────────────────────────────────

  async function request(bookId: string, contact: string, message?: string) {
    const { data } = await api.post(`/books/${bookId}/request`, {
      contact,
      message: message ?? null,
    })
    return data
  }

  async function fetchIncomingRequests() {
    const { data } = await api.get('/books/requests/incoming')
    incomingRequests.value = data
    return data
  }

  async function fetchMyBooks() {
    const { data } = await api.get('/books/mine')
    myBooks.value = data
    return data
  }

  async function fetchOutgoingRequests() {
    const { data } = await api.get('/books/requests/outgoing')
    outgoingRequests.value = data
    return data
  }

  async function fetchRequestDetail(requestId: string) {
    const { data } = await api.get(`/books/request/${requestId}`)
    return data
  }

  async function acceptRequest(bookId: string, requestId: string) {
    const { data } = await api.patch(`/books/${bookId}/request/${requestId}/accept`)
    const r = incomingRequests.value.find((x) => x.id === requestId)
    if (r) {
      r.status = 'accepted'
      r.contact = data.contact
    }
    // Any other pending requests on the same book get auto-declined server-side
    for (const x of incomingRequests.value) {
      if (x.book?.id === bookId && x.id !== requestId && x.status === 'pending') {
        x.status = 'declined'
      }
    }
    // Keep the "my books" view in sync (status → donated, contact revealed)
    const b = myBooks.value.find((x) => x.id === bookId)
    if (b) {
      b.status = 'donated'
      if (b.request) {
        b.request.status = 'accepted'
        b.request.contact = data.contact
      }
    }
    return data
  }

  async function declineRequest(bookId: string, requestId: string) {
    await api.patch(`/books/${bookId}/request/${requestId}/decline`)
    const r = incomingRequests.value.find((x) => x.id === requestId)
    if (r) r.status = 'declined'
    const b = myBooks.value.find((x) => x.id === bookId)
    if (b && b.request?.id === requestId) b.request = null
  }

  return {
    books,
    currentBook,
    loading,
    error,
    incomingRequests,
    myBooks,
    outgoingRequests,
    fetchAll,
    fetchOne,
    uploadCover,
    donate,
    remove,
    request,
    fetchIncomingRequests,
    fetchMyBooks,
    fetchOutgoingRequests,
    fetchRequestDetail,
    acceptRequest,
    declineRequest,
  }
})

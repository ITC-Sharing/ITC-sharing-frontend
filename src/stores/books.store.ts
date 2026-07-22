import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/axios'
import type {
  Book,
  BookRequestDetail,
  BookStats,
  IncomingBookRequest,
  MyBook,
  OutgoingBookRequest,
} from '@/types'

export const useBooksStore = defineStore('books', () => {
  const books = ref<Book[]>([])
  const currentBook = ref<Book | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const incomingRequests = ref<IncomingBookRequest[]>([])
  const myBooks = ref<MyBook[]>([])
  const outgoingRequests = ref<OutgoingBookRequest[]>([])
  const bookStats = ref<BookStats>({ listed: 0, received: 0, pendingIncoming: 0 })

  async function fetchAll(majorId?: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<Book[]>('/books', {
        params: majorId ? { major_id: majorId } : {},
      })
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
      const { data } = await api.get<Book>(`/books/${id}`)
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
    const { data } = await api.post<{ url: string }>('/books/upload-cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.url
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
      const { data } = await api.post<Book>('/books', payload)
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
    myBooks.value = myBooks.value.filter((b) => b.id !== bookId)
  }

  async function update(
    bookId: string,
    payload: {
      title?: string
      department?: string
      description?: string
      contact?: string
      cover_image_url?: string
    },
  ) {
    const { data } = await api.patch<MyBook>(`/books/${bookId}`, payload)
    const i = myBooks.value.findIndex((b) => b.id === bookId)
    if (i !== -1) myBooks.value[i] = { ...myBooks.value[i], ...data }
    return data
  }

  // ── Book requests ─────────────────────────────────────────────────────────

  async function request(bookId: string, contact: string, message: string) {
    const { data } = await api.post(`/books/${bookId}/request`, {
      contact,
      message,
    })
    return data
  }

  async function fetchIncomingRequests() {
    const { data } = await api.get<IncomingBookRequest[]>('/books/requests/incoming')
    incomingRequests.value = data
    return data
  }

  async function fetchMyBooks(filter: 'all' | 'pending' | 'donated' = 'all') {
    const { data } = await api.get<MyBook[]>('/books/mine', { params: { filter } })
    myBooks.value = data
    return data
  }

  async function fetchOutgoingRequests(status?: 'pending' | 'accepted') {
    const { data } = await api.get<OutgoingBookRequest[]>('/books/requests/outgoing', {
      params: status ? { status } : {},
    })
    outgoingRequests.value = data
    return data
  }

  async function fetchBookStats() {
    const { data } = await api.get<BookStats>('/books/stats')
    bookStats.value = data
    return data
  }

  async function fetchRequestDetail(requestId: string) {
    const { data } = await api.get<BookRequestDetail>(`/books/request/${requestId}`)
    return data
  }

  async function acceptRequest(bookId: string, requestId: string) {
    const { data } = await api.patch<{ message: string; contact: string }>(
      `/books/${bookId}/request/${requestId}/accept`,
    )
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

  async function declineRequest(bookId: string, requestId: string, reason?: string) {
    await api.patch(`/books/${bookId}/request/${requestId}/decline`, { reason })
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
    bookStats,
    fetchAll,
    fetchOne,
    uploadCover,
    donate,
    update,
    remove,
    request,
    fetchIncomingRequests,
    fetchMyBooks,
    fetchOutgoingRequests,
    fetchBookStats,
    fetchRequestDetail,
    acceptRequest,
    declineRequest,
  }
})

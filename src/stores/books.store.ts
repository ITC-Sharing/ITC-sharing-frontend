import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as booksApi from '@/services/books.api'
import type { Paginated } from '@/types/api.types'
import type {
  Book,
  BookRequestDetail,
  BookStats,
  IncomingBookRequest,
  MyBook,
  OutgoingBookRequest,
} from '@/types/books.types'
export const useBooksStore = defineStore('books', () => {
  const books = ref<Book[]>([])
  // Full filtered count from the server, for a pager. Equals books.length until
  // a limit is passed.
  const booksTotal = ref(0)
  const currentBook = ref<Book | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const incomingRequests = ref<IncomingBookRequest[]>([])
  const myBooks = ref<MyBook[]>([])
  const outgoingRequests = ref<OutgoingBookRequest[]>([])
  const bookStats = ref<BookStats>({ listed: 0, donated: 0, received: 0, pendingIncoming: 0 })

  async function fetchAll(majorId?: string, page?: number, limit?: number) {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string | number> = {}
      if (majorId) params.major_id = majorId
      if (page) params.page = page
      if (limit) params.limit = limit
      const data = await booksApi.fetchBooks(params)
      books.value = data.items
      booksTotal.value = data.total
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
      const data = await booksApi.fetchBook(id)
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
    const data = await booksApi.uploadCover(formData)
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
      const data = await booksApi.donateBook(payload)
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
    await booksApi.deleteBook(bookId)
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
    const data = await booksApi.updateBook(bookId, payload)
    const i = myBooks.value.findIndex((b) => b.id === bookId)
    if (i !== -1) myBooks.value[i] = { ...myBooks.value[i], ...data }
    return data
  }

  // ── Book requests ─────────────────────────────────────────────────────────

  async function request(bookId: string, message: string) {
    // Telegram comes from the profile now — nothing to pass.
    return booksApi.requestBook(bookId, message)
  }

  async function fetchIncomingRequests() {
    const data = await booksApi.fetchIncomingRequests()
    incomingRequests.value = data
    return data
  }

  async function fetchMyBooks(
    filter: 'all' | 'pending' | 'donated' | 'available' | 'received' | 'reserved' = 'all',
  ) {
    const data = await booksApi.fetchMyBooks(filter)
    myBooks.value = data
    return data
  }

  async function fetchOutgoingRequests(status?: 'pending' | 'accepted') {
    const data = await booksApi.fetchOutgoingRequests(status)
    outgoingRequests.value = data
    return data
  }

  async function fetchBookStats() {
    const data = await booksApi.fetchBookStats()
    bookStats.value = data
    return data
  }

  async function fetchRequestDetail(requestId: string) {
    const data = await booksApi.fetchRequestDetail(requestId)
    return data
  }

  async function acceptRequest(bookId: string, requestId: string) {
    const data = await booksApi.acceptRequest(bookId, requestId)
    await Promise.all([fetchMyBooks(), fetchBookStats()])
    return data
  }

  /** Either side calls it off — the book goes back on the shelf. */
  async function cancelRequest(bookId: string, requestId: string) {
    const data = await booksApi.cancelRequest(bookId, requestId)
    await Promise.all([fetchMyBooks(), fetchOutgoingRequests(), fetchBookStats()])
    return data
  }

  /** Receiver confirms the handover — this is what marks the book donated. */
  async function completeRequest(bookId: string, requestId: string) {
    const data = await booksApi.completeRequest(bookId, requestId)
    await Promise.all([fetchOutgoingRequests(), fetchBookStats()])
    return data
  }

  async function declineRequest(bookId: string, requestId: string, reason?: string) {
    await booksApi.declineRequest(bookId, requestId, reason)
    const r = incomingRequests.value.find((x) => x.id === requestId)
    if (r) r.status = 'declined'
    const b = myBooks.value.find((x) => x.id === bookId)
    if (b && b.request?.id === requestId) b.request = null
  }

  return {
    books,
    booksTotal,
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
    cancelRequest,
    completeRequest,
    declineRequest,
  }
})

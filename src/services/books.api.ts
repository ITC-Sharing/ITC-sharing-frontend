// Transport only: one function per endpoint, returning the response body.
// Loading flags, error handling and any reshaping stay in the store.
import api from './http'
import type {
  Book,
  BookRequestDetail,
  BookStats,
  IncomingBookRequest,
  MyBook,
  OutgoingBookRequest,
} from '@/types/books.types'
import type { Paginated } from '@/types/api.types'

export function fetchBooks(params: Record<string, string | number>) {
  return api.get<Paginated<Book>>('/books', { params }).then((r) => r.data)
}

export function fetchBook(id: string) {
  return api.get<Book>(`/books/${id}`).then((r) => r.data)
}

/** Takes the already-built FormData — assembling it stays in the store. */
export function uploadCover(formData: FormData) {
  return api
    .post<{ url: string }>('/books/upload-cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

export function donateBook(payload: Record<string, unknown>) {
  return api.post<Book>('/books', payload).then((r) => r.data)
}

export function deleteBook(bookId: string) {
  return api.delete(`/books/${bookId}`)
}

export function updateBook(bookId: string, payload: Record<string, unknown>) {
  return api.patch<MyBook>(`/books/${bookId}`, payload).then((r) => r.data)
}

export function requestBook(bookId: string, message: string) {
  // No contact: the requester's Telegram comes from their profile.
  return api.post(`/books/${bookId}/request`, { message }).then((r) => r.data)
}

export function fetchIncomingRequests() {
  return api.get<IncomingBookRequest[]>('/books/requests/incoming').then((r) => r.data)
}

export function fetchMyBooks(
  filter: 'all' | 'pending' | 'donated' | 'available' | 'received' | 'reserved',
) {
  return api.get<MyBook[]>('/books/mine', { params: { filter } }).then((r) => r.data)
}

export function fetchOutgoingRequests(status?: 'pending' | 'accepted') {
  return api
    .get<OutgoingBookRequest[]>('/books/requests/outgoing', {
      params: status ? { status } : {},
    })
    .then((r) => r.data)
}

export function fetchBookStats() {
  return api.get<BookStats>('/books/stats').then((r) => r.data)
}

export function fetchRequestDetail(requestId: string) {
  return api.get<BookRequestDetail>(`/books/request/${requestId}`).then((r) => r.data)
}

export function acceptRequest(bookId: string, requestId: string) {
  // No body: where and when is arranged on Telegram.
  return api.patch(`/books/${bookId}/request/${requestId}/accept`).then((r) => r.data)
}

/** Either side calls off a reservation; the book returns to available. */
export function cancelRequest(bookId: string, requestId: string) {
  return api.patch(`/books/${bookId}/request/${requestId}/cancel`).then((r) => r.data)
}

/** Receiver confirms the handover; this is what marks the book donated. */
export function completeRequest(bookId: string, requestId: string) {
  return api.patch(`/books/${bookId}/request/${requestId}/complete`).then((r) => r.data)
}

export function declineRequest(bookId: string, requestId: string, reason?: string) {
  return api.patch(`/books/${bookId}/request/${requestId}/decline`, { reason })
}

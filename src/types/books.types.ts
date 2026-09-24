// API response shapes, not raw TypeORM entities — the backend reshapes rows
// before sending them. Nullability mirrors the database exactly.

import type { UserRef } from '@/types/user.types'
import type { MajorRef } from '@/types/major.types'

/** Enforced by a CHECK constraint on `books.status`. */
export type BookStatus = 'available' | 'reserved' | 'donated'

/** Enforced by a CHECK constraint on `book_requests.status`. */
export type BookRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired'
  | 'completed'

/** The book summary the API embeds in request payloads. */
export interface BookRef {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
}

/** `GET /books` and `GET /books/:id`, both via `bookShape`. */
export interface Book {
  id: string
  title: string
  description: string | null
  contact: string | null
  status: BookStatus
  cover_image_url: string | null
  created_at: string
  majors: MajorRef | null
  users: UserRef | null
  has_active_request: boolean
  /**
   * Who is waiting on this book, sent to the donor alone — null for everyone
   * else, and null once a request is accepted.
   */
  pending_request: {
    id: string
    requester: { first_name: string; last_name: string }
  } | null
}

/**
 * The request attached to one of my books. `contact` is withheld by the server
 * until the request is accepted.
 */
export interface MyBookRequest {
  id: string
  status: BookRequestStatus
  message: string | null
  /** The requester's Telegram, from their profile. Null until accepted. */
  contact: string | null
  /** Where the donor said to meet, given on acceptance. */
  handover_location: string | null
  handover_note: string | null
  requested_at: string
  requester: UserRef
}

/** `GET /books/mine` — my listings, each with its active request if any. */
export interface MyBook {
  id: string
  /** Whether this is a book you listed or one you were given. */
  role: 'donor' | 'receiver'
  /** Who gave it to you; null on your own listings. */
  donor: UserRef | null
  title: string
  description: string | null
  cover_image_url: string | null
  status: BookStatus
  created_at: string
  majors: MajorRef | null
  request: MyBookRequest | null
}

/** `GET /books/requests/incoming` — requests on books I donated. */
export interface IncomingBookRequest {
  id: string
  status: BookRequestStatus
  message: string | null
  /** Null until accepted. */
  contact: string | null
  requested_at: string
  resolved_at: string | null
  book: BookRef
  requester: UserRef
}

/** `GET /books/requests/outgoing` — requests I made on others' books. */
export interface OutgoingBookRequest {
  id: string
  status: BookRequestStatus
  requested_at: string
  /** The donor's Telegram, null until accepted. */
  contact: string | null
  /** Where to meet, agreed by the donor on acceptance. Null before that. */
  handover_location: string | null
  handover_note: string | null
  accepted_at: string | null
  completed_at: string | null
  book: BookRef
  donor: UserRef
}

/**
 * `GET /books/request/:id` — powers the notification detail page. `contact` is
 * whichever side's the viewer needs, and only once accepted.
 */
export interface BookRequestDetail {
  id: string
  role: 'donor' | 'requester'
  status: BookRequestStatus
  message: string | null
  requested_at: string
  resolved_at: string | null
  decline_reason: string | null
  book: BookRef
  requester: UserRef
  donor: UserRef
  contact: string | null
}

/** `GET /books/stats` — cheap COUNT queries, no rows fetched. */
export interface BookStats {
  /** Everything you have put up, whatever became of it. */
  listed: number
  /** The subset that actually changed hands. */
  donated: number
  received: number
  pendingIncoming: number
}

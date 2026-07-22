// Shapes returned by the API, not the raw TypeORM entities.
//
// The backend reshapes uploads before sending them (`toFeedShape` in
// documents.service.ts), keeping the nested `users` / `majors` / `subjects`
// keys the frontend has read since the Supabase days. Mirror that shape here,
// including nullability — a field that is `| null` in the database is `| null`
// here, so the compiler makes us handle it at the point of use.

/** Enforced by a CHECK constraint on `uploads.status`. */
export type UploadStatus = 'pending' | 'active' | 'rejected'

/** A single file inside an upload, as returned by the feed and detail endpoints. */
export interface UploadFile {
  id: string
  file_url: string
  /** Null on legacy rows written before the size was recorded. */
  file_size_kb: number | null
  original_name: string | null
}

/** `GET /documents/mine` omits `file_url` — the dashboard only lists names and sizes. */
export type MyUploadFile = Omit<UploadFile, 'file_url'>

/** The trimmed user the API embeds in uploads, books and requests. */
export interface UserRef {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

export interface MajorRef {
  id: string
  acronym: string
}

export interface SubjectRef {
  id: string
  name: string
  slug: string
}

export interface DocumentTag {
  tag: string
}

/**
 * An upload as returned by `GET /documents` (feed) and `GET /documents/:id`.
 * Both go through `toFeedShape`, so they share one type.
 */
export interface Upload {
  id: string
  title: string
  doc_type: string
  year_level: number
  academic_year: string | null
  uploaded_at: string
  users: UserRef | null
  majors: MajorRef | null
  subjects: SubjectRef | null
  document_tags: DocumentTag[]
  documents: UploadFile[]
}

/**
 * An upload as returned by `GET /documents/mine`. Distinct from `Upload`: it
 * carries moderation fields the public feed never exposes, and its nested
 * `subjects` has no slug and its `documents` have no `file_url`.
 */
export interface MyUpload {
  id: string
  title: string
  doc_type: string
  year_level: number
  academic_year: string | null
  /** Never 'active': `findMine` filters to pending|rejected in SQL. */
  status: Exclude<UploadStatus, 'active'>
  rejection_reason: string | null
  rejected_at: string | null
  uploaded_at: string
  subjects: Omit<SubjectRef, 'slug'> | null
  majors: MajorRef | null
  document_tags: DocumentTag[]
  documents: MyUploadFile[]
}

/** `GET /documents/stats` — aggregated server-side. */
export interface DocumentStats {
  total: number
  size_kb: number
}

// ─── Majors ──────────────────────────────────────────────────────────────────

/** `GET /majors` returns the full row. */
export interface Major {
  id: string
  name: string
  acronym: string
  image_url: string | null
}

// ─── Subjects ────────────────────────────────────────────────────────────────

/** Enforced by a CHECK constraint on `subjects.status`. */
export type SubjectStatus = 'pending' | 'active' | 'rejected'

/**
 * `GET /subjects` — a partial row. The query selects only these six columns,
 * so `status`, `major_id` and the timestamps are genuinely absent, not just
 * unread.
 */
export interface Subject {
  id: string
  name: string
  slug: string
  year_level: number
  semester: number | null
  subject_url: string | null
}

/** `GET /subjects/mine` — carries moderation fields and the owning major. */
export interface MySubject extends Subject {
  status: SubjectStatus
  rejection_reason: string | null
  rejected_at: string | null
  created_at: string
  majors: MajorRef | null
}

// ─── Books ───────────────────────────────────────────────────────────────────

/** Enforced by a CHECK constraint on `books.status`. */
export type BookStatus = 'available' | 'donated'

/** Enforced by a CHECK constraint on `book_requests.status`. */
export type BookRequestStatus = 'pending' | 'accepted' | 'declined'

/** The book summary the API embeds in request payloads. */
export interface BookRef {
  id: string
  title: string
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
}

/**
 * The request attached to one of my books. `contact` is withheld by the server
 * until the request is accepted.
 */
export interface MyBookRequest {
  id: string
  status: BookRequestStatus
  message: string | null
  contact: string | null
  requested_at: string
  requester: UserRef
}

/** `GET /books/mine` — my listings, each with its active request if any. */
export interface MyBook {
  id: string
  title: string
  description: string | null
  contact: string | null
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
  /** The donor's contact, null until accepted. */
  contact: string | null
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
  listed: number
  received: number
  pendingIncoming: number
}

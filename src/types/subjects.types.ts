// API response shapes, not raw TypeORM entities — the backend reshapes rows
// before sending them. Nullability mirrors the database exactly.

import type { MajorRef } from '@/types/major.types'

/** Enforced by a CHECK constraint on `subjects.status`. */
export type SubjectStatus = 'pending' | 'active' | 'rejected'

export interface SubjectRef {
  id: string
  name: string
  /** Short display code — initials of `name`, uppercased. */
  acronym: string
  /** Null for subjects recorded without one. */
  semester: number | null
}

/**
 * `GET /subjects` — a partial row. The query selects only these six columns,
 * so `status`, `major_id` and the timestamps are genuinely absent, not just
 * unread.
 */
export interface Subject {
  id: string
  name: string
  /** Short display code — initials of `name`, uppercased. */
  acronym: string
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

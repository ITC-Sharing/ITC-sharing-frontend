// API response shapes, not raw TypeORM entities — the backend reshapes rows
// before sending them. Nullability mirrors the database exactly.

/** The trimmed user the API embeds in uploads, books and requests. */
export interface UserRef {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

// API response shapes, not raw TypeORM entities — the backend reshapes rows
// before sending them. Nullability mirrors the database exactly.

export interface MajorRef {
  id: string
  acronym: string
}

/** `GET /majors` returns the full row. */
export interface Major {
  id: string
  name: string
  acronym: string
  image_url: string | null
}

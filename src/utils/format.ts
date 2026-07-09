export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
  const date = new Date(normalized)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay <= 3) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatFileSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

/** Lowercased file extension (without the dot), or '' when there's none. */
export function fileExtension(name: string | null | undefined): string {
  return (name ?? '').split('.').pop()?.toLowerCase() ?? ''
}

/** True for raster image files that can be shown directly in an <img>. */
export function isImageFile(name: string | null | undefined): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension(name))
}

/** Colored badge (background class + short label) for a file by its extension. */
export function getFileIcon(name: string | null | undefined): { bg: string; label: string } {
  const ext = fileExtension(name)
  if (ext === 'pdf') return { bg: 'bg-red-500', label: 'PDF' }
  if (['doc', 'docx'].includes(ext)) return { bg: 'bg-blue-500', label: 'DOC' }
  if (['xls', 'xlsx'].includes(ext)) return { bg: 'bg-green-500', label: 'XLS' }
  if (['ppt', 'pptx'].includes(ext)) return { bg: 'bg-orange-500', label: 'PPT' }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { bg: 'bg-purple-500', label: 'IMG' }
  if (['zip', 'rar', '7z'].includes(ext)) return { bg: 'bg-yellow-500', label: 'ZIP' }
  return { bg: 'bg-gray-400', label: 'FILE' }
}

export function formatTotalFileSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${(kb / (1024 * 1024)).toFixed(2)} GB`
}

export function telegramHref(contact: string): string | null {
  const trimmed = contact.trim()
  if (trimmed.startsWith('@')) return `https://t.me/${trimmed.slice(1)}`
  const match = trimmed.match(/^(?:https?:\/\/)?t\.me\/(.+)$/i)
  return match ? `https://t.me/${match[1]}` : null
}

export function reqStatusBadge(status: string): string {
  if (status === 'accepted') return 'bg-green-100 text-green-700'
  if (status === 'declined') return 'bg-red-100 text-red-600'
  return 'bg-yellow-100 text-yellow-700'
}

export function reqInitials(first?: string, last?: string): string {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase()
}

export function truncateText(text: string, maxChars = 120): string {
  return text.length > maxChars ? `${text.slice(0, maxChars).trimEnd()}…` : text
}

// Human-readable text — letters (any language, incl. Khmer marks), numbers,
// spaces and hyphens, with at least one letter/number. No special characters.
export const TEXT_NAME_PATTERN = /^(?=.*[\p{L}\p{N}])[\p{L}\p{M}\p{N}\s-]+$/u

// Strip disallowed characters (e.g. from an auto-filled file name) so the value
// passes TEXT_NAME_PATTERN without surprising the user with an instant error.
export function sanitizeTextName(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{M}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// A single tag — letters/numbers (any language) joined by single hyphens.
// No spaces and no special characters.
export const TEXT_TAG_PATTERN = /^[\p{L}\p{M}\p{N}]+(?:-[\p{L}\p{M}\p{N}]+)*$/u

// Characters never allowed in free-text fields (template-injection chars).
export const FORBIDDEN_TEXT_PATTERN = /[${}]/

// ─── Academic level helpers ──────────────────────────────────────────────────
// English & French are language courses graded by CEFR level (A1–B2) rather
// than numeric academic years. The DB still stores year_level 1–4; these map
// the stored number to the right label.

// Years 1–4 of a language course map to CEFR codes; year 5 is a normal "Year 5".
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2']
export const LANGUAGE_LEVEL_COUNT = 5

export function isLanguageMajor(acronym?: string | null): boolean {
  const a = (acronym ?? '').toLowerCase()
  return a === 'english' || a === 'french'
}

/** CEFR label for a language major's year_level, or null for normal majors. */
export function cefrLevel(
  acronym: string | null | undefined,
  year: number | string,
): string | null {
  const n = Number(year)
  if (isLanguageMajor(acronym) && n >= 1 && n <= CEFR_LEVELS.length) return CEFR_LEVELS[n - 1]!
  return null
}

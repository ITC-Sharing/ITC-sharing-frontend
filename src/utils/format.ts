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

/**
 * How a file type is drawn, everywhere it appears — one entry per family so a
 * colour is never spelled out twice.
 *
 *   solid — filled badge with a white label (file lists, notifications)
 *   soft  — tinted panel with a coloured glyph (upload cards)
 *
 * The classes are written in full because Tailwind scans source text: a
 * composed string like `bg-${colour}-500` would never make it into the build.
 */
export type FileTypeStyle = { label: string; solid: string; soft: string }

const FILE_TYPE_STYLES: Record<string, FileTypeStyle> = {
  pdf: { label: 'PDF', solid: 'bg-white', soft: 'bg-white text-red-500' },
  word: { label: 'DOC', solid: 'bg-white', soft: 'bg-white text-blue-500' },
  slides: { label: 'PPT', solid: 'bg-white', soft: 'bg-white text-orange-500' },
  image: { label: 'IMG', solid: 'bg-white', soft: 'bg-white text-green-600' },
  archive: { label: 'ZIP', solid: 'bg-white', soft: 'bg-white text-yellow-600' },
  sheet: { label: 'XLS', solid: 'bg-white', soft: 'bg-white text-teal-600' },
  other: { label: 'FILE', solid: 'bg-white', soft: 'bg-white text-gray-500' },
}

const FILE_TYPE_BY_EXTENSION: Record<string, keyof typeof FILE_TYPE_STYLES> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  ppt: 'slides',
  pptx: 'slides',
  xls: 'sheet',
  xlsx: 'sheet',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
}

/** Colours and short label for a file, by its extension. */
export function fileTypeStyle(name: string | null | undefined): FileTypeStyle {
  const family = FILE_TYPE_BY_EXTENSION[fileExtension(name)] ?? 'other'
  return FILE_TYPE_STYLES[family]!
}

/** Colored badge (background class + short label) for a file by its extension. */
export function getFileIcon(name: string | null | undefined): { bg: string; label: string } {
  const style = fileTypeStyle(name)
  return { bg: style.solid, label: style.label }
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
// Departments count in plain academic years. The Department of Foreign
// Languages (DFL) is the exception: every student takes its courses alongside
// their own department, so nobody registers into it, and its `year_level` slot
// holds the LANGUAGE rather than a year — 1 = English, 2 = French. The CEFR
// levels below that (A1, A2, B1, …) are ordinary subject rows.

export function isLanguageMajor(acronym?: string | null): boolean {
  return (acronym ?? '').toLowerCase() === 'dfl'
}

// Indexed by DFL's year_level (1-based).
const DFL_LANGUAGE_KEYS = ['common.departmentPage.languageEnglish', 'common.departmentPage.languageFrench']

/**
 * i18n key naming what a major's `year_level` stands for, or null when it's a
 * plain academic year. Callers translate it; null means "use Year N".
 */
export function languageLabelKey(
  acronym: string | null | undefined,
  year: number | string,
): string | null {
  const n = Number(year)
  if (isLanguageMajor(acronym) && n >= 1 && n <= DFL_LANGUAGE_KEYS.length)
    return DFL_LANGUAGE_KEYS[n - 1]!
  return null
}

/**
 * The values a major's `year_level` can take: Foundation covers years 1–2,
 * DFL holds its two languages, and every department major takes students from
 * year 3 onwards.
 */
export function yearLevelsForMajor(acronym?: string | null): number[] {
  const a = (acronym ?? '').toLowerCase()
  if (a === 'dfl') return [1, 2]
  if (a === 'foundation') return [1, 2]
  return [3, 4, 5]
}

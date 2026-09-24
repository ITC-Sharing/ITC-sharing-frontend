import { useI18n } from 'vue-i18n'

/**
 * Localized "3d ago" style dates.
 *
 * formatRelativeDate() in utils/format.ts does the same job but is a pure
 * function with no access to `t()`, so its wording is English-only. Anything
 * user-facing that needs translating goes through this instead.
 *
 * Past three days it falls back to a plain numeric date — by then "97d ago" is
 * less useful than the date itself, and the numeric form needs no translation.
 */
export function useRelativeDate() {
  const { t } = useI18n({ useScope: 'global' })

  function relativeDate(iso: string | null | undefined): string {
    if (!iso) return '—'
    // Timestamps without a zone are UTC from the API; Date would otherwise read
    // them as local time and drift by the offset.
    const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`
    const date = new Date(normalized)
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

    if (seconds < 60) return t('common.time.justNow')
    if (seconds < 3600) return t('common.time.minutesAgo', { n: Math.floor(seconds / 60) })
    if (seconds < 86400) return t('common.time.hoursAgo', { n: Math.floor(seconds / 3600) })
    if (seconds < 259200) return t('common.time.daysAgo', { n: Math.floor(seconds / 86400) })

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return { relativeDate }
}

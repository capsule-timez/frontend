const LOCALE = 'pt-BR'

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long', timeStyle: 'short' })
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const diff = Date.parse(iso) - now
  const abs = Math.abs(diff)

  if (abs < MINUTE) return relativeFormat.format(0, 'second')
  if (abs < HOUR) return relativeFormat.format(Math.round(diff / MINUTE), 'minute')
  if (abs < DAY) return relativeFormat.format(Math.round(diff / HOUR), 'hour')
  if (abs < 30 * DAY) return relativeFormat.format(Math.round(diff / DAY), 'day')
  if (abs < 365 * DAY) return relativeFormat.format(Math.round(diff / (30 * DAY)), 'month')
  return relativeFormat.format(Math.round(diff / (365 * DAY)), 'year')
}

export function isInFuture(iso: string, now = Date.now()): boolean {
  return Date.parse(iso) > now
}

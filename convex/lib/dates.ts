import { env } from '@/convex/_generated/server'

// The en-CA locale formats dates as YYYY-MM-DD.
export const todayInAppTimezone = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: env.APP_TIMEZONE }).format(
    new Date()
  )

// Real 'YYYY-MM-DD' days only: Date rolls '2026-02-30' over to 2 March, so the round trip catches it.
export const isCalendarDay = (text: string) => {
  const date = new Date(`${text}T00:00:00Z`)

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(text) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === text
  )
}

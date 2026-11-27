import { env } from '@/convex/_generated/server'

// The en-CA locale formats dates as YYYY-MM-DD.
export const todayInAppTimezone = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: env.APP_TIMEZONE }).format(
    new Date()
  )

import { defineApp } from 'convex/server'
import { v } from 'convex/values'

// Declaring env vars here makes them typed and makes a deploy fail if one is missing.
export default defineApp({
  env: {
    CLERK_JWT_ISSUER_DOMAIN: v.string(),
  },
})

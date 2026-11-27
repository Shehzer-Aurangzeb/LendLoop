import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    role: v.union(v.literal('user'), v.literal('admin')),
    isTrustedLender: v.boolean(),
  }).index('by_token', ['tokenIdentifier']),
})

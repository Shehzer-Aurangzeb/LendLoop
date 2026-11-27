import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const categoryValidator = v.union(
  v.literal('power-tools'),
  v.literal('hand-tools'),
  v.literal('garden'),
  v.literal('kitchen'),
  v.literal('camping'),
  v.literal('other')
)

export const conditionValidator = v.union(
  v.literal('like-new'),
  v.literal('good'),
  v.literal('worn')
)

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    role: v.union(v.literal('user'), v.literal('admin')),
    isTrustedLender: v.boolean(),
  }).index('by_token', ['tokenIdentifier']),

  tools: defineTable({
    ownerId: v.id('users'),
    name: v.string(),
    description: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    // Soft delete: loans still point at the tool after removal.
    removedAt: v.optional(v.number()),
  })
    .index('by_owner', ['ownerId'])
    .index('by_category', ['category']),

  loans: defineTable({
    toolId: v.id('tools'),
    borrowerId: v.id('users'),
    // Copied from the tool so "incoming requests" reads one index, no join.
    lenderId: v.id('users'),
    // 'YYYY-MM-DD' strings sort as dates, which the endDate index relies on.
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal('requested'),
      v.literal('approved'),
      v.literal('declined'),
      v.literal('returned'),
      v.literal('cancelled')
    ),
  })
    .index('by_tool', ['toolId'])
    .index('by_borrower', ['borrowerId'])
    .index('by_lender', ['lenderId'])
    .index('by_status_and_endDate', ['status', 'endDate']),

  loanActivity: defineTable({
    loanId: v.id('loans'),
    kind: v.union(
      v.literal('request-notification'),
      v.literal('overdue-reminder')
    ),
    outcome: v.union(v.literal('sent'), v.literal('failed')),
    // 'YYYY-MM-DD', the day it happened.
    date: v.string(),
  }).index('by_loan_and_date', ['loanId', 'date']),
})

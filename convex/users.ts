import { ConvexError, v } from 'convex/values'
import { mutation } from './_generated/server'

export const store = mutation({
  args: {},
  returns: v.id('users'),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new ConvexError('Please sign in')
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('by_token', (q) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .unique()

    // Admins set role and isTrustedLender; a sign-in must never reset them.
    if (existing) {
      return existing._id
    }

    return await ctx.db.insert('users', {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name?.trim() || 'Neighbour',
      email: identity.email,
      role: 'user',
      isTrustedLender: false,
    })
  },
})

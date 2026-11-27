import { v } from 'convex/values'
import { mutation, query } from '@/convex/_generated/server'
import {
  findSignedInUser,
  findUserByToken,
  requireIdentity,
} from '@/convex/lib/auth'

export const store = mutation({
  args: {},
  returns: v.id('users'),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const existing = await findUserByToken(ctx, identity.tokenIdentifier)

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

// A UI hint only; every admin function checks the role itself with requireAdmin.
export const amIAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const user = await findSignedInUser(ctx)

    return user?.role === 'admin'
  },
})

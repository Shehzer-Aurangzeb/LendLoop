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
    const tokenName = identity.name?.trim()

    // Refreshes only what Clerk owns; role and isTrustedLender are the admin's.
    // A token missing a claim keeps the stored value instead of blanking it.
    if (existing) {
      const name = tokenName || existing.name
      const email = identity.email ?? existing.email

      // Skipping an unchanged write keeps every query that reads users from rerunning.
      if (name !== existing.name || email !== existing.email) {
        await ctx.db.patch(existing._id, { name, email })
      }

      return existing._id
    }

    return await ctx.db.insert('users', {
      tokenIdentifier: identity.tokenIdentifier,
      name: tokenName || 'Neighbour',
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

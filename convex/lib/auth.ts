import { ConvexError } from 'convex/values'
import type { QueryCtx } from '@/convex/_generated/server'

// Only for users.store, which runs before the caller has a users row.
export const requireIdentity = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new ConvexError('Please sign in.')
  }

  return identity
}

export const findUserByToken = (ctx: QueryCtx, tokenIdentifier: string) =>
  ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', tokenIdentifier))
    .unique()

// Never throws: for UI hints like amIAdmin, where signed out just means "no".
export const findSignedInUser = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity()

  return identity ? await findUserByToken(ctx, identity.tokenIdentifier) : null
}

export const requireUser = async (ctx: QueryCtx) => {
  const identity = await requireIdentity(ctx)
  const user = await findUserByToken(ctx, identity.tokenIdentifier)

  if (!user) {
    throw new ConvexError('Your account is not set up yet.')
  }

  return user
}

export const requireAdmin = async (ctx: QueryCtx) => {
  const user = await requireUser(ctx)

  if (user.role !== 'admin') {
    throw new ConvexError('Admins only.')
  }

  return user
}

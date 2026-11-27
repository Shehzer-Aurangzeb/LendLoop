import type { QueryCtx } from '@/convex/_generated/server'
import type { Doc, Id } from '@/convex/_generated/dataModel'

// The full name never leaves the server; neighbours see only this.
export const firstNameOf = (user: Doc<'users'> | null | undefined) =>
  user ? user.name.trim().split(/\s+/)[0] : ''

export const loadUsersById = async (ctx: QueryCtx, ids: Id<'users'>[]) =>
  new Map(
    await Promise.all(
      [...new Set(ids)].map(async (id) => [id, await ctx.db.get(id)] as const)
    )
  )

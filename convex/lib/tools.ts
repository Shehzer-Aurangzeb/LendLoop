import { ConvexError } from 'convex/values'
import type { QueryCtx } from '@/convex/_generated/server'
import type { Id } from '@/convex/_generated/dataModel'

// Removed tools are soft-deleted, so a removed one is "not found" like a missing one.
export const requireLiveTool = async (ctx: QueryCtx, toolId: Id<'tools'>) => {
  const tool = await ctx.db.get(toolId)

  if (!tool || tool.removedAt !== undefined) {
    throw new ConvexError('Tool not found.')
  }

  return tool
}

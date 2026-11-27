import { v } from 'convex/values'
import { mutation, query } from '@/convex/_generated/server'
import { requireAdmin } from '@/convex/lib/auth'
import { declineWaitingRequests } from '@/convex/lib/loans'
import { requireLiveTool } from '@/convex/lib/tools'
import { firstNameOf, loadUsersById } from '@/convex/lib/users'
import { categoryValidator } from '@/convex/schema'

// ponytail: loads every live tool; paginate like the loan list if tools pass the hundreds.
export const listListings = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('tools'),
      name: v.string(),
      category: categoryValidator,
      lenderFirstName: v.string(),
    })
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const tools = (await ctx.db.query('tools').collect()).filter(
      (tool) => tool.removedAt === undefined
    )
    const lenders = await loadUsersById(
      ctx,
      tools.map((tool) => tool.ownerId)
    )

    return tools
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ _id, name, category, ownerId }) => ({
        _id,
        name,
        category,
        lenderFirstName: firstNameOf(lenders.get(ownerId)),
      }))
  },
})

// Unlike the lender's removeOwn, this works while lent out: the approved loan runs to its end.
export const removeListing = mutation({
  args: { toolId: v.id('tools') },
  returns: v.null(),
  handler: async (ctx, { toolId }) => {
    await requireAdmin(ctx)
    await requireLiveTool(ctx, toolId)
    await declineWaitingRequests(ctx, toolId)
    await ctx.db.patch(toolId, { removedAt: Date.now() })

    return null
  },
})

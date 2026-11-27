import { v } from 'convex/values'
import { query } from '@/convex/_generated/server'
import { categoryValidator } from '@/convex/schema'

// Public on purpose: the signed-out tool list, so no auth helper call.
export const listPublic = query({
  args: {},
  returns: v.array(
    v.object({ name: v.string(), category: categoryValidator })
  ),
  handler: async (ctx) => {
    const tools = await ctx.db.query('tools').collect()

    return tools
      .filter((tool) => tool.removedAt === undefined)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, category }) => ({ name, category }))
  },
})

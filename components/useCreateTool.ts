import { useMutation } from 'convex/react'
import type { FunctionArgs } from 'convex/server'
import { ConvexError } from 'convex/values'
import { api } from '@/convex/_generated/api'

export type NewTool = FunctionArgs<typeof api.tools.create>

// Resolves to a short message for the form, or null when the tool was listed.
export const useCreateTool = () => {
  const create = useMutation(api.tools.create)

  return async (tool: NewTool) => {
    try {
      await create(tool)

      return null
    } catch (error) {
      console.error('tools.create failed', error)
      // Only our ConvexError messages are written for people; anything else is not.
      if (error instanceof ConvexError && typeof error.data === 'string') {
        return error.data
      }

      return 'We could not list your tool. Please try again.'
    }
  }
}

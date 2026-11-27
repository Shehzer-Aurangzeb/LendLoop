import { useMutation } from 'convex/react'
import type { FunctionArgs } from 'convex/server'
import { ConvexError } from 'convex/values'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export type ToolFields = FunctionArgs<typeof api.tools.create>

// Resolves to a short message for the form, or null when the change worked.
const messageAfterChange = async (
  change: () => Promise<unknown>,
  fallback: string
) => {
  try {
    await change()

    return null
  } catch (error) {
    console.error('Changing a tool failed', error)
    // Only our ConvexError messages are written for people; anything else is not.
    if (error instanceof ConvexError && typeof error.data === 'string') {
      return error.data
    }

    return fallback
  }
}

export const useOwnToolChanges = () => {
  const create = useMutation(api.tools.create)
  const update = useMutation(api.tools.update)
  const removeOwn = useMutation(api.tools.removeOwn)

  return {
    createTool: (fields: ToolFields) =>
      messageAfterChange(
        () => create(fields),
        'We could not list your tool. Please try again.'
      ),
    updateTool: (fields: ToolFields & { toolId: Id<'tools'> }) =>
      messageAfterChange(
        () => update(fields),
        'We could not save your changes. Please try again.'
      ),
    removeTool: (toolId: Id<'tools'>) =>
      messageAfterChange(
        () => removeOwn({ toolId }),
        'We could not remove your tool. Please try again.'
      ),
  }
}

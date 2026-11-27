import { useMutation } from 'convex/react'
import type { FunctionArgs } from 'convex/server'
import { ConvexError } from 'convex/values'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export type ToolFields = FunctionArgs<typeof api.tools.create>

// Resolves to a short message for the form, or null when the save worked.
const messageAfterSaving = async (
  save: () => Promise<unknown>,
  fallback: string
) => {
  try {
    await save()

    return null
  } catch (error) {
    console.error('Saving a tool failed', error)
    // Only our ConvexError messages are written for people; anything else is not.
    if (error instanceof ConvexError && typeof error.data === 'string') {
      return error.data
    }

    return fallback
  }
}

export const useSaveTool = () => {
  const create = useMutation(api.tools.create)
  const update = useMutation(api.tools.update)

  return {
    createTool: (fields: ToolFields) =>
      messageAfterSaving(
        () => create(fields),
        'We could not list your tool. Please try again.'
      ),
    updateTool: (fields: ToolFields & { toolId: Id<'tools'> }) =>
      messageAfterSaving(
        () => update(fields),
        'We could not save your changes. Please try again.'
      ),
  }
}

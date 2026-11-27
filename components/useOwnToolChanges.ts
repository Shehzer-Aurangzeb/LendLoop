import { useMutation } from 'convex/react'
import type { FunctionArgs } from 'convex/server'
import { messageAfterChange } from '@/components/messageAfterChange'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export type ToolFields = FunctionArgs<typeof api.tools.create>

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

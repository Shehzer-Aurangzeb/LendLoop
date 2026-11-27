import { useMutation } from 'convex/react'
import { messageAfterChange } from '@/components/messageAfterChange'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export const useRemoveListing = () => {
  const removeListing = useMutation(api.admin.removeListing)

  return (toolId: Id<'tools'>) =>
    messageAfterChange(
      () => removeListing({ toolId }),
      'We could not remove this listing. Please try again.'
    )
}

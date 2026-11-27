import { useMutation } from 'convex/react'
import { messageAfterChange } from '@/components/messageAfterChange'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export const useMarkReturned = () => {
  const markReturned = useMutation(api.loans.markReturned)

  return (loanId: Id<'loans'>) =>
    messageAfterChange(
      () => markReturned({ loanId }),
      'We could not mark this loan returned. Please try again.'
    )
}

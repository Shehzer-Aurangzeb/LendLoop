import { useMutation } from 'convex/react'
import { messageAfterChange } from '@/components/messageAfterChange'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export const useRequestAnswers = () => {
  const approve = useMutation(api.loans.approve)
  const decline = useMutation(api.loans.decline)

  return {
    approveRequest: (loanId: Id<'loans'>) =>
      messageAfterChange(
        () => approve({ loanId }),
        'We could not approve this request. Please try again.'
      ),
    declineRequest: (loanId: Id<'loans'>) =>
      messageAfterChange(
        () => decline({ loanId }),
        'We could not decline this request. Please try again.'
      ),
  }
}

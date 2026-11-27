import { useMutation } from 'convex/react'
import { messageAfterChange } from '@/components/messageAfterChange'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export const useCancelRequest = () => {
  const cancel = useMutation(api.loans.cancel)

  return (loanId: Id<'loans'>) =>
    messageAfterChange(
      () => cancel({ loanId }),
      'We could not cancel this request. Please try again.'
    )
}

import { useMutation } from 'convex/react'
import type { FunctionArgs } from 'convex/server'
import { messageAfterChange } from '@/components/messageAfterChange'
import { api } from '@/convex/_generated/api'

export const useBorrowRequest = () => {
  const request = useMutation(api.loans.request)

  return (args: FunctionArgs<typeof api.loans.request>) =>
    messageAfterChange(
      () => request(args),
      'We could not send your request. Please try again.'
    )
}

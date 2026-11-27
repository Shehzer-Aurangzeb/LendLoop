import { useMutation } from 'convex/react'
import { messageAfterChange } from '@/components/messageAfterChange'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export const useSetTrustedLender = () => {
  const setTrustedLender = useMutation(api.admin.setTrustedLender)

  return (userId: Id<'users'>, isTrusted: boolean) =>
    messageAfterChange(
      () => setTrustedLender({ userId, isTrusted }),
      'We could not change the Trusted Lender mark. Please try again.'
    )
}

import type { FunctionReturnType } from 'convex/server'
import { formatShortDate } from '@/components/formatShortDate'
import type { api } from '@/convex/_generated/api'

type MyTool = FunctionReturnType<typeof api.tools.listMine>[number]

// 'With Liam until Sat 28 Nov · 1 request waiting'; '' when there is nothing to say.
export const formatToolStatusLine = ({
  lentOut,
  waitingRequestCount,
}: Pick<MyTool, 'lentOut' | 'waitingRequestCount'>) => {
  const parts: string[] = []

  if (lentOut) {
    const { borrowerFirstName, until, isOverdue } = lentOut

    parts.push(
      isOverdue
        ? `With ${borrowerFirstName}, due back ${formatShortDate(until)}`
        : `With ${borrowerFirstName} until ${formatShortDate(until)}`
    )
  }
  if (waitingRequestCount > 0) {
    const noun = waitingRequestCount === 1 ? 'request' : 'requests'

    parts.push(`${waitingRequestCount} ${noun} waiting`)
  }

  return parts.join(' · ')
}

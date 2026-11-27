'use client'

import { useId } from 'react'
import ListSkeleton from '@/components/ListSkeleton'
import SectionHeading from '@/components/SectionHeading'
import WaitingRequestCard from '@/components/WaitingRequestCard'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

const WaitingSection = () => {
  const headingId = useId()
  const requests = useQueryOnceUserReady(api.loans.listWaitingForMe)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-2.5">
        <SectionHeading id={headingId}>Waiting for you</SectionHeading>
        <span className="text-sm text-ink-muted">
          Neighbours asking for your tools
        </span>
      </div>
      {requests === undefined ? (
        <ListSkeleton label="Loading your loans" rowHeightPx={88} />
      ) : requests.length === 0 ? (
        <p className="text-[15px] text-ink-muted">No requests waiting.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
          {requests.map((request) => (
            <WaitingRequestCard key={request._id} request={request} />
          ))}
        </div>
      )}
    </section>
  )
}

export default WaitingSection

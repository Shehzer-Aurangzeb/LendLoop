'use client'

import PageTitle from '@/components/PageTitle'
import ToolDetailsSkeleton from '@/components/ToolDetailsSkeleton'
import ToolProfile from '@/components/ToolProfile'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

const ToolDetails = ({ toolId }: { toolId: string }) => {
  const tool = useQueryOnceUserReady(api.tools.getForToolPage, { toolId })

  if (tool === undefined) {
    return <ToolDetailsSkeleton />
  }

  if (tool === null) {
    return (
      <div className="flex flex-col gap-2">
        <PageTitle>Tool not found</PageTitle>
        <p className="text-[15px] text-ink-muted">
          It may have been removed by its lender.
        </p>
      </div>
    )
  }

  return <ToolProfile toolId={toolId} tool={tool} />
}

export default ToolDetails

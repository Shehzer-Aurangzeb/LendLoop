'use client'

import { categoryLabels } from '@/components/categoryLabels'
import CategoryTile from '@/components/CategoryTile'
import { conditionLabels } from '@/components/conditionLabels'
import MyToolListSkeleton from '@/components/MyToolListSkeleton'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

const MyToolList = () => {
  const tools = useQueryOnceUserReady(api.tools.listMine)

  if (tools === undefined) {
    return <MyToolListSkeleton />
  }

  if (tools.length === 0) {
    return (
      <p className="text-[15px] text-ink-muted">
        You haven&rsquo;t listed a tool yet.
      </p>
    )
  }

  return (
    <ul aria-label="Your tools" className="flex flex-col gap-3">
      {tools.map((tool) => (
        <li
          key={tool._id}
          className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-3.5"
        >
          <div className="w-24 flex-none">
            <CategoryTile category={tool.category} />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[17px] font-semibold break-words">
              {tool.name}
            </span>
            <span className="text-sm text-ink-muted">
              {categoryLabels[tool.category]} ·{' '}
              {conditionLabels[tool.condition]}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default MyToolList

'use client'

import { useState } from 'react'
import { boardGridClass } from '@/components/boardGridClass'
import BoardSkeleton from '@/components/BoardSkeleton'
import BoardToolCard from '@/components/BoardToolCard'
import CategoryFilter from '@/components/CategoryFilter'
import type { CategoryChoice } from '@/components/CategoryFilter'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

const ToolBoard = () => {
  const tools = useQueryOnceUserReady(api.tools.listForBoard)
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryChoice>('all')
  const [isHidingMine, setIsHidingMine] = useState(false)

  if (tools === undefined) {
    return <BoardSkeleton />
  }

  if (tools.length === 0) {
    return (
      <p className="text-[15px] text-ink-muted">No tools on the board yet.</p>
    )
  }

  const shownTools = tools.filter(
    (tool) =>
      (selectedCategory === 'all' ||
        tool.category === selectedCategory) &&
      !(isHidingMine && tool.isMine)
  )

  return (
    <div className="flex flex-col gap-6">
      <p className="text-base text-ink-muted">
        {tools.length} {tools.length === 1 ? 'tool' : 'tools'} on the board.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
        <CategoryFilter selected={selectedCategory}
          onSelect={setSelectedCategory} />
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={isHidingMine}
            onChange={(event) => setIsHidingMine(event.target.checked)}
            className="size-[18px] accent-accent"
          />
          Hide my own tools
        </label>
      </div>
      {shownTools.length === 0 ? (
        <p className="text-[15px] text-ink-muted">
          No tools match these filters.
        </p>
      ) : (
        <ul aria-label="Tools" className={boardGridClass}>
          {shownTools.map((tool) => (
            <li key={tool._id}>
              <BoardToolCard tool={tool} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ToolBoard

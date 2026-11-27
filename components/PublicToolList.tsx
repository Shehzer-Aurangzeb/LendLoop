'use client'

import { useState } from 'react'
import CategoryFilter from '@/components/CategoryFilter'
import type { CategoryChoice } from '@/components/CategoryFilter'
import { categoryLabels } from '@/components/categoryLabels'
import ToolCard from '@/components/ToolCard'
import { usePublicTools } from '@/components/usePublicTools'

const SKELETON_CARDS = 4

const toolGridClass =
  'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4'

// "Power tools" must not become "No power tools tools listed yet."
const emptyListMessage = (choice: CategoryChoice) => {
  if (choice === 'all') return 'No tools listed yet.'
  const noun = categoryLabels[choice].toLowerCase()

  return `No ${noun.endsWith('tools') ? noun : `${noun} tools`} listed yet.`
}

const countLine = (count: number, choice: CategoryChoice) => {
  const tools = `${count} ${count === 1 ? 'tool' : 'tools'}`

  return choice === 'all'
    ? `${tools} shared by neighbours`
    : `${tools} in ${categoryLabels[choice].toLowerCase()}`
}

const PublicToolList = () => {
  const tools = usePublicTools()
  const [selected, setSelected] = useState<CategoryChoice>('all')

  if (tools === undefined) {
    return (
      <ul
        aria-busy="true"
        aria-label="Loading tools"
        className={`mt-[18px] ${toolGridClass}`}
      >
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <li
            key={index}
            className="aspect-[5/4] animate-pulse rounded-[18px] bg-line"
          />
        ))}
      </ul>
    )
  }

  const shownTools =
    selected === 'all'
      ? tools
      : tools.filter((tool) => tool.category === selected)

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[15px] text-ink-muted">
        {countLine(shownTools.length, selected)}
      </p>
      <CategoryFilter selected={selected} onSelect={setSelected} />
      {shownTools.length === 0 ? (
        <p className="text-[15px] text-ink-muted">
          {emptyListMessage(selected)}
        </p>
      ) : (
        <ul aria-label="Tools" className={toolGridClass}>
          {shownTools.map((tool, index) => (
            // No id is public and names can repeat, so the key uses the position.
            <li key={`${index}-${tool.name}`}>
              <ToolCard name={tool.name} category={tool.category} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PublicToolList

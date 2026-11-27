'use client'

import { useState } from 'react'
import CategoryFilter from '@/components/CategoryFilter'
import type { CategoryChoice } from '@/components/CategoryFilter'
import { categoryLabels } from '@/components/categoryLabels'
import { usePublicTools } from '@/components/usePublicTools'

const SKELETON_ROWS = 4

// "Power tools" must not become "No power tools tools listed yet."
const emptyListMessage = (choice: CategoryChoice) => {
  if (choice === 'all') return 'No tools listed yet.'
  const noun = categoryLabels[choice].toLowerCase()

  return `No ${noun.endsWith('tools') ? noun : `${noun} tools`} listed yet.`
}

const PublicToolList = () => {
  const tools = usePublicTools()
  const [selected, setSelected] = useState<CategoryChoice>('all')

  if (tools === undefined) {
    return (
      <ul aria-busy="true" aria-label="Loading tools" className="space-y-2">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <li
            key={index}
            className="h-12 animate-pulse rounded-md bg-zinc-100"
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
    <div className="flex flex-col gap-4">
      <CategoryFilter selected={selected} onSelect={setSelected} />
      {shownTools.length === 0 ? (
        <p className="text-zinc-600">{emptyListMessage(selected)}</p>
      ) : (
        <ul aria-label="Tools" className="divide-y divide-zinc-200">
          {shownTools.map((tool, index) => (
            // No id is public and names can repeat, so the key uses the position.
            <li
              key={`${index}-${tool.name}`}
              className="flex items-center justify-between py-3"
            >
              <span className="font-medium">{tool.name}</span>
              <span className="text-sm text-zinc-600">
                {categoryLabels[tool.category]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PublicToolList

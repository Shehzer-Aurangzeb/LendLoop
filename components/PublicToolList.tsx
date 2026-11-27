'use client'

import { categoryLabels } from '@/components/categoryLabels'
import { usePublicTools } from '@/components/usePublicTools'

const SKELETON_ROWS = 4

const PublicToolList = () => {
  const tools = usePublicTools()

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

  if (tools.length === 0) {
    return <p className="text-zinc-600">No tools listed yet.</p>
  }

  return (
    <ul aria-label="Tools" className="divide-y divide-zinc-200">
      {tools.map((tool, index) => (
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
  )
}

export default PublicToolList

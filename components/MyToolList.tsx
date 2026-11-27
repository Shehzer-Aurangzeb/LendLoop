import type { FunctionReturnType } from 'convex/server'
import { categoryLabels } from '@/components/categoryLabels'
import CategoryTile from '@/components/CategoryTile'
import { conditionLabels } from '@/components/conditionLabels'
import type { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

type MyToolListProps = {
  tools: FunctionReturnType<typeof api.tools.listMine>
  onEdit: (toolId: Id<'tools'>) => void
}

export const editToolButtonId = (toolId: Id<'tools'>) => `edit-tool-${toolId}`

const MyToolList = ({ tools, onEdit }: MyToolListProps) => {
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
          className="flex flex-wrap items-center gap-4 rounded-[20px] border border-line bg-surface p-3.5"
        >
          <div className="w-24 flex-none">
            <CategoryTile category={tool.category} />
          </div>
          <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
            <span className="text-[17px] font-semibold break-words">
              {tool.name}
            </span>
            <span className="text-sm text-ink-muted">
              {categoryLabels[tool.category]} ·{' '}
              {conditionLabels[tool.condition]}
            </span>
          </div>
          <button
            type="button"
            id={editToolButtonId(tool._id)}
            aria-label={`Edit ${tool.name}`}
            onClick={() => onEdit(tool._id)}
            className="min-h-11 cursor-pointer rounded-full border border-line-strong px-4 text-sm font-semibold text-ink hover:bg-ground"
          >
            Edit
          </button>
        </li>
      ))}
    </ul>
  )
}

export default MyToolList

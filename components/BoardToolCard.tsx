import type { FunctionReturnType } from 'convex/server'
import { categoryLabels } from '@/components/categoryLabels'
import CategoryTile from '@/components/CategoryTile'
import { conditionLabels } from '@/components/conditionLabels'
import { formatShortDate } from '@/components/formatShortDate'
import StrokeIcon from '@/components/StrokeIcon'
import type { api } from '@/convex/_generated/api'

type BoardTool = FunctionReturnType<typeof api.tools.listForBoard>[number]

const SHIELD_CHECK_PATH =
  'M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z M8.5 12l2.5 2.5 4.5-5'

const outBadgeText = ({
  until,
  isOverdue,
}: {
  until: string
  isOverdue: boolean
}) =>
  isOverdue
    ? `Out, due back ${formatShortDate(until)}`
    : `Out until ${formatShortDate(until)}`

const BoardToolCard = ({ tool }: { tool: BoardTool }) => (
  <article className="flex h-full flex-col gap-3.5 rounded-[20px] border border-line bg-surface px-2.5 pt-2.5 pb-4">
    <div className="relative">
      <CategoryTile category={tool.category} />
      {tool.lentOut && (
        <span className="absolute top-2.5 left-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white">
          {outBadgeText(tool.lentOut)}
        </span>
      )}
    </div>
    <div className="flex flex-col gap-1.5 px-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold break-words">{tool.name}</h2>
        <span className="text-xs whitespace-nowrap text-ink-muted">
          {conditionLabels[tool.condition]}
        </span>
      </div>
      <span className="text-sm text-ink-muted">
        {categoryLabels[tool.category]}
      </span>
    </div>
    <div className="mt-auto flex items-center gap-2.5 border-t border-dashed border-line px-1.5 pt-3">
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent"
      >
        {tool.lenderFirstName.charAt(0)}
      </span>
      <span className="text-sm text-ink-soft">{tool.lenderFirstName}</span>
      {tool.isLenderTrusted && (
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
          <StrokeIcon
            path={SHIELD_CHECK_PATH}
            strokeWidth={2.4}
            className="size-[13px]"
          />
          Trusted
        </span>
      )}
    </div>
  </article>
)

export default BoardToolCard

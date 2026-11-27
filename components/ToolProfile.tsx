import { useId } from 'react'
import type { FunctionReturnType } from 'convex/server'
import Link from 'next/link'
import AlreadyLentDates from '@/components/AlreadyLentDates'
import { categoryLabels } from '@/components/categoryLabels'
import CategoryTile from '@/components/CategoryTile'
import { conditionLabels } from '@/components/conditionLabels'
import LenderCard from '@/components/LenderCard'
import PageTitle from '@/components/PageTitle'
import type { api } from '@/convex/_generated/api'

type ToolForPage = NonNullable<
  FunctionReturnType<typeof api.tools.getForToolPage>
>

const chipClass =
  'rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-ink-soft'

const ToolProfile = ({ tool }: { tool: ToolForPage }) => {
  const panelTitleId = useId()

  return (
    <div className="flex flex-wrap items-start gap-10">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
        <CategoryTile category={tool.category} />
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            <span className={chipClass}>{categoryLabels[tool.category]}</span>
            <span className={chipClass}>{conditionLabels[tool.condition]}</span>
          </div>
          <PageTitle>{tool.name}</PageTitle>
          <p className="max-w-[36em] text-lg leading-relaxed whitespace-pre-line text-ink-soft">
            {tool.description}
          </p>
        </div>
        <LenderCard
          firstName={tool.lenderFirstName}
          isTrusted={tool.isLenderTrusted}
        />
      </div>
      <aside
        aria-labelledby={panelTitleId}
        className="flex min-w-0 flex-[1_1_360px] flex-col gap-5 rounded-3xl border border-line bg-surface p-6"
      >
        <h2
          id={panelTitleId}
          className="font-display text-2xl font-semibold tracking-[-0.02em]"
        >
          {tool.isMine ? 'Your tool' : 'Ask to borrow'}
        </h2>
        {tool.isMine ? (
          <p className="text-[15px] text-ink-soft">
            This is your tool. Change it in{' '}
            <Link href="/my-tools" className="font-medium text-accent underline">
              My tools
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-ink-muted">
            Whole days. The first and last day both count.
          </p>
        )}
        <AlreadyLentDates loans={tool.approvedLoans} />
      </aside>
    </div>
  )
}

export default ToolProfile

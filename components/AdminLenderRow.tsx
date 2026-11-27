'use client'

import { useState } from 'react'
import type { FunctionReturnType } from 'convex/server'
import AdminRow from '@/components/AdminRow'
import InlineError from '@/components/InlineError'
import { outlineButtonClass } from '@/components/outlineButtonClass'
import StrokeIcon, { CHECK_PATH } from '@/components/StrokeIcon'
import { useSetTrustedLender } from '@/components/useSetTrustedLender'
import type { api } from '@/convex/_generated/api'

type Lender = FunctionReturnType<typeof api.admin.listLenders>[number]

const AdminLenderRow = ({ lender }: { lender: Lender }) => {
  const setTrustedLender = useSetTrustedLender()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTrusted = async () => {
    if (isSaving) {
      return
    }
    setIsSaving(true)
    setError(null)
    setError(await setTrustedLender(lender.userId, !lender.isTrustedLender))
    setIsSaving(false)
  }

  return (
    <AdminRow
      title={lender.firstName}
      detail={
        lender.liveToolCount === 1
          ? '1 live tool'
          : `${lender.liveToolCount} live tools`
      }
    >
      {/* aria-disabled, not disabled, so focus survives saving. */}
      <button
        type="button"
        aria-pressed={lender.isTrustedLender}
        aria-disabled={isSaving}
        aria-busy={isSaving}
        onClick={toggleTrusted}
        className={`${outlineButtonClass} inline-flex items-center gap-1.5 aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent aria-busy:animate-pulse`}
      >
        {lender.isTrustedLender && (
          <StrokeIcon path={CHECK_PATH} strokeWidth={2.3} className="size-4" />
        )}
        Trusted Lender
        <span className="sr-only"> {lender.firstName}</span>
      </button>
      <InlineError message={error} />
    </AdminRow>
  )
}

export default AdminLenderRow

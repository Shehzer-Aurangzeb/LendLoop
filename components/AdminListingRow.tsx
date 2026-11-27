'use client'

import { useState } from 'react'
import type { FunctionReturnType } from 'convex/server'
import { categoryLabels } from '@/components/categoryLabels'
import InlineError from '@/components/InlineError'
import RemoveToolButton from '@/components/RemoveToolButton'
import { useRemoveListing } from '@/components/useRemoveListing'
import type { api } from '@/convex/_generated/api'

type Listing = FunctionReturnType<typeof api.admin.listListings>[number]

type AdminListingRowProps = {
  listing: Listing
  onRemoved: () => void
}

const AdminListingRow = ({ listing, onRemoved }: AdminListingRowProps) => {
  const removeListing = useRemoveListing()
  const [error, setError] = useState<string | null>(null)

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line bg-surface p-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[17px] font-semibold break-words">
          {listing.name}
        </span>
        <span className="text-sm text-ink-muted">
          {categoryLabels[listing.category]} · lent by {listing.lenderFirstName}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <RemoveToolButton
          toolName={listing.name}
          removeTool={() => removeListing(listing._id)}
          onRemoved={onRemoved}
          onRefused={setError}
        />
        <InlineError message={error} />
      </div>
    </li>
  )
}

export default AdminListingRow

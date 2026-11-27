'use client'

import { useState } from 'react'
import type { FunctionReturnType } from 'convex/server'
import AdminRow from '@/components/AdminRow'
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
    <AdminRow
      title={listing.name}
      detail={`${categoryLabels[listing.category]} · lent by ${listing.lenderFirstName}`}
    >
      <RemoveToolButton
        toolName={listing.name}
        removeTool={() => removeListing(listing._id)}
        onRemoved={onRemoved}
        onRefused={setError}
      />
      <InlineError message={error} />
    </AdminRow>
  )
}

export default AdminListingRow

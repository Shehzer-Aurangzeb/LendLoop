'use client'

import { useEffect, useState } from 'react'
import MyToolList, { editToolButtonId } from '@/components/MyToolList'
import MyToolListSkeleton from '@/components/MyToolListSkeleton'
import ToolForm from '@/components/ToolForm'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

const MyToolsWorkspace = () => {
  const tools = useQueryOnceUserReady(api.tools.listMine)
  const [editingToolId, setEditingToolId] = useState<Id<'tools'>>()
  const [toolIdToRefocus, setToolIdToRefocus] = useState<Id<'tools'>>()
  // Read from the live list, so a tool removed elsewhere quietly drops the form back to "List a tool".
  const toolBeingEdited = tools?.find((tool) => tool._id === editingToolId)

  // After the row re-renders, so a renamed tool's button is announced with its new name.
  useEffect(() => {
    if (toolIdToRefocus) {
      document.getElementById(editToolButtonId(toolIdToRefocus))?.focus()
    }
  }, [toolIdToRefocus])

  const startEditing = (toolId: Id<'tools'>) => {
    setToolIdToRefocus(undefined)
    setEditingToolId(toolId)
  }

  const finishEditing = () => {
    setToolIdToRefocus(editingToolId)
    setEditingToolId(undefined)
  }

  return (
    <div className="flex flex-wrap items-start gap-10">
      <div className="flex min-w-0 flex-[999_1_460px] flex-col">
        {tools === undefined ? (
          <MyToolListSkeleton />
        ) : (
          <MyToolList tools={tools} onEdit={startEditing} />
        )}
      </div>
      {/* A new key per tool gives the form fresh fields instead of the last draft. */}
      <ToolForm
        key={toolBeingEdited?._id ?? 'new'}
        toolBeingEdited={toolBeingEdited}
        onEditingDone={finishEditing}
      />
    </div>
  )
}

export default MyToolsWorkspace

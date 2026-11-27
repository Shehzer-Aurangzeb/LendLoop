'use client'

import { useEffect, useState } from 'react'
import MyToolList, { editToolButtonId } from '@/components/MyToolList'
import ListSkeleton from '@/components/ListSkeleton'
import ToolForm, { toolFormHeadingId } from '@/components/ToolForm'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

const MyToolsWorkspace = () => {
  const tools = useQueryOnceUserReady(api.tools.listMine)
  const [editingToolId, setEditingToolId] = useState<Id<'tools'>>()
  const [elementIdToFocus, setElementIdToFocus] = useState<string>()
  // Read from the live list, so a tool removed elsewhere quietly drops the form back to "List a tool".
  const toolBeingEdited = tools?.find((tool) => tool._id === editingToolId)

  // After the re-render, so focus lands on the Edit button with its new name, or on the form once its tool is gone.
  useEffect(() => {
    if (elementIdToFocus) {
      document.getElementById(elementIdToFocus)?.focus()
    }
  }, [elementIdToFocus])

  const startEditing = (toolId: Id<'tools'>) => {
    setElementIdToFocus(undefined)
    setEditingToolId(toolId)
  }

  const finishEditing = () => {
    setElementIdToFocus(editingToolId && editToolButtonId(editingToolId))
    setEditingToolId(undefined)
  }

  // The removed tool's row is gone, so focus lands on the form, now "List a tool".
  const finishRemoving = () => {
    setElementIdToFocus(toolFormHeadingId)
    setEditingToolId(undefined)
  }

  return (
    <div className="flex flex-wrap items-start gap-10">
      <div className="flex min-w-0 flex-[999_1_460px] flex-col">
        {tools === undefined ? (
          <ListSkeleton label="Loading your tools" rowHeightPx={102} />
        ) : (
          <MyToolList tools={tools} onEdit={startEditing} />
        )}
      </div>
      {/* A new key per tool gives the form fresh fields instead of the last draft. */}
      <ToolForm
        key={toolBeingEdited?._id ?? 'new'}
        toolBeingEdited={toolBeingEdited}
        onEditingDone={finishEditing}
        onRemoved={finishRemoving}
      />
    </div>
  )
}

export default MyToolsWorkspace

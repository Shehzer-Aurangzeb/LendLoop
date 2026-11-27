'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { categoryLabels } from '@/components/categoryLabels'
import InlineError from '@/components/InlineError'
import PhotoPlaceholder from '@/components/PhotoPlaceholder'
import RadioGroup from '@/components/RadioGroup'
import RemoveToolButton from '@/components/RemoveToolButton'
import { conditionLabels } from '@/components/conditionLabels'
import { useOwnToolChanges } from '@/components/useOwnToolChanges'
import type { ToolFields } from '@/components/useOwnToolChanges'
import type { Id } from '@/convex/_generated/dataModel'
import {
  TOOL_DESCRIPTION_MAX_LENGTH,
  TOOL_NAME_MAX_LENGTH,
} from '@/convex/toolLimits'

const emptyTool: ToolFields = {
  name: '',
  description: '',
  category: 'power-tools',
  condition: 'good',
}

const fieldLabelClass =
  'flex flex-col gap-1.5 text-sm font-medium text-ink-soft'
const inputClass =
  'rounded-xl border border-line-strong p-3 text-[15px] font-normal text-ink'

export const toolFormHeadingId = 'tool-form-title'

const createLabels = {
  heading: 'List a tool',
  submit: 'Put it on the board',
  saving: 'Listing…',
}

const editLabels = {
  heading: 'Edit tool',
  submit: 'Save changes',
  saving: 'Saving…',
}

type ToolFormProps = {
  // Undefined means the form lists a new tool.
  toolBeingEdited?: ToolFields & { _id: Id<'tools'> }
  onEditingDone: () => void
  onRemoved: () => void
}

const ToolForm = ({
  toolBeingEdited,
  onEditingDone,
  onRemoved,
}: ToolFormProps) => {
  const { createTool, updateTool } = useOwnToolChanges()
  // Picked field by field: listMine rows carry loan status, which update's validator rejects.
  const [tool, setTool] = useState<ToolFields>(() =>
    toolBeingEdited
      ? {
          name: toolBeingEdited.name,
          description: toolBeingEdited.description,
          category: toolBeingEdited.category,
          condition: toolBeingEdited.condition,
        }
      : emptyTool
  )
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const editingToolId = toolBeingEdited?._id

  useEffect(() => {
    if (editingToolId) {
      headingRef.current?.focus()
    }
  }, [editingToolId])

  const labels = editingToolId ? editLabels : createLabels

  const change = (fields: Partial<ToolFields>) =>
    setTool((current) => ({ ...current, ...fields }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    const message = editingToolId
      ? await updateTool({ toolId: editingToolId, ...tool })
      : await createTool(tool)

    setIsSaving(false)
    setError(message)
    if (message !== null) {
      return
    }
    if (editingToolId) {
      onEditingDone()
    } else {
      setTool(emptyTool)
    }
  }

  return (
    <section
      aria-labelledby={toolFormHeadingId}
      className="flex flex-[1_1_400px] flex-col gap-5 rounded-3xl border border-line bg-surface p-6"
    >
      <h2
        id={toolFormHeadingId}
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-2xl font-semibold tracking-[-0.02em]"
      >
        {labels.heading}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <PhotoPlaceholder category={tool.category} />
        <label className={fieldLabelClass}>
          Name
          <input
            type="text"
            required
            maxLength={TOOL_NAME_MAX_LENGTH}
            placeholder="e.g. Pressure washer"
            value={tool.name}
            onChange={(event) => change({ name: event.target.value })}
            className={`min-h-11 ${inputClass}`}
          />
        </label>
        <RadioGroup
          legend="Category"
          look="pills"
          name="category"
          labels={categoryLabels}
          selected={tool.category}
          onSelect={(category) => change({ category })}
        />
        <RadioGroup
          legend="Condition"
          look="segmented"
          name="condition"
          labels={conditionLabels}
          selected={tool.condition}
          onSelect={(condition) => change({ condition })}
        />
        <label className={fieldLabelClass}>
          Description
          <textarea
            rows={3}
            required
            maxLength={TOOL_DESCRIPTION_MAX_LENGTH}
            placeholder="What’s included, anything to know before borrowing"
            aria-describedby="description-hint"
            value={tool.description}
            onChange={(event) => change({ description: event.target.value })}
            className={`resize-y ${inputClass}`}
          />
          <span
            id="description-hint"
            className="text-xs font-normal text-ink-muted"
          >
            Only signed-in neighbours see this. Skip your address.
          </span>
        </label>
        <InlineError message={error} />
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-[50px] flex-1 cursor-pointer rounded-full bg-accent px-5 text-base font-semibold text-white hover:bg-accent-strong disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving ? labels.saving : labels.submit}
          </button>
          {editingToolId && (
            <button
              type="button"
              onClick={onEditingDone}
              className="min-h-[50px] cursor-pointer rounded-full border border-line-strong px-5 text-base font-semibold text-ink hover:bg-ground"
            >
              Cancel
            </button>
          )}
        </div>
        {editingToolId && (
          <RemoveToolButton
            toolId={editingToolId}
            onRemoved={onRemoved}
            onRefused={setError}
          />
        )}
      </form>
    </section>
  )
}

export default ToolForm

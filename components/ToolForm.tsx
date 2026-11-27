'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { categoryLabels } from '@/components/categoryLabels'
import CategoryTile from '@/components/CategoryTile'
import PillRadioGroup from '@/components/PillRadioGroup'
import SegmentedRadioGroup from '@/components/SegmentedRadioGroup'
import { conditionLabels } from '@/components/conditionLabels'
import { useCreateTool } from '@/components/useCreateTool'
import type { NewTool } from '@/components/useCreateTool'
import {
  TOOL_DESCRIPTION_MAX_LENGTH,
  TOOL_NAME_MAX_LENGTH,
} from '@/convex/toolLimits'

const emptyTool: NewTool = {
  name: '',
  description: '',
  category: 'power-tools',
  condition: 'good',
}

const fieldLabelClass =
  'flex flex-col gap-1.5 text-sm font-medium text-ink-soft'
const inputClass =
  'rounded-xl border border-line-strong p-3 text-[15px] font-normal text-ink'

const ToolForm = () => {
  const createTool = useCreateTool()
  const [tool, setTool] = useState<NewTool>(emptyTool)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const change = (fields: Partial<NewTool>) =>
    setTool((current) => ({ ...current, ...fields }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    const message = await createTool(tool)

    setIsSaving(false)
    setError(message)
    if (message === null) {
      setTool(emptyTool)
    }
  }

  return (
    <section
      aria-labelledby="add-title"
      className="flex flex-[1_1_400px] flex-col gap-5 rounded-3xl border border-line bg-surface p-6"
    >
      <h2
        id="add-title"
        className="font-display text-2xl font-semibold tracking-[-0.02em]"
      >
        List a tool
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Upload comes later; the tile shows what neighbours will see meanwhile. */}
        <div className="flex flex-col items-center gap-2 rounded-[18px] border-2 border-dashed border-line-strong bg-ground px-4 py-5 text-center">
          <div className="w-24">
            <CategoryTile category={tool.category} />
          </div>
          <span className="text-[13px] text-ink-muted">
            Photos coming soon
          </span>
        </div>
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
        <PillRadioGroup
          legend="Category"
          name="category"
          labels={categoryLabels}
          selected={tool.category}
          onSelect={(category) => change({ category })}
        />
        <SegmentedRadioGroup
          legend="Condition"
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
        {error && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="min-h-[50px] cursor-pointer rounded-full bg-accent px-5 text-base font-semibold text-white hover:bg-accent-strong disabled:cursor-wait disabled:opacity-70"
        >
          {isSaving ? 'Listing…' : 'Put it on the board'}
        </button>
      </form>
    </section>
  )
}

export default ToolForm

'use client'

import { useRef, useState } from 'react'
import { useOwnToolChanges } from '@/components/useOwnToolChanges'
import type { Id } from '@/convex/_generated/dataModel'

type RemoveToolButtonProps = {
  toolId: Id<'tools'>
  onRemoved: () => void
  onRefused: (message: string) => void
}

const RemoveToolButton = ({
  toolId,
  onRemoved,
  onRefused,
}: RemoveToolButtonProps) => {
  const { removeTool } = useOwnToolChanges()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const removeButtonRef = useRef<HTMLButtonElement>(null)

  const handleRemoveClick = async () => {
    if (isRemoving) {
      return
    }
    if (!isConfirming) {
      setIsConfirming(true)

      return
    }
    setIsRemoving(true)
    const message = await removeTool(toolId)

    if (message === null) {
      onRemoved()

      return
    }
    setIsRemoving(false)
    setIsConfirming(false)
    onRefused(message)
  }

  // "Keep it" disappears on click, so hand focus back to the button that stays.
  const keepTool = () => {
    setIsConfirming(false)
    removeButtonRef.current?.focus()
  }

  return (
    <div className="flex flex-wrap gap-3 border-t border-line pt-5">
      {/* One button for both steps keeps focus in place; aria-disabled, not disabled, so focus survives a refusal. */}
      <button
        type="button"
        ref={removeButtonRef}
        aria-disabled={isRemoving}
        onClick={handleRemoveClick}
        className="min-h-11 cursor-pointer rounded-full border border-red-700 px-5 text-sm font-semibold text-red-700 hover:bg-red-50 aria-disabled:cursor-wait aria-disabled:opacity-70"
      >
        {isRemoving ? 'Removing…' : isConfirming ? 'Yes, remove' : 'Remove'}
      </button>
      {isConfirming && !isRemoving && (
        <button
          type="button"
          onClick={keepTool}
          className="min-h-11 cursor-pointer rounded-full border border-line-strong px-5 text-sm font-semibold text-ink hover:bg-ground"
        >
          Keep it
        </button>
      )}
    </div>
  )
}

export default RemoveToolButton

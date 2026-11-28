import { useState } from 'react'

export type RowAfterChange = 'leaves' | 'stays'

// The button is gone after a change, so focus would drop to <body>.
const focusAfterChange = (button: HTMLElement, row: RowAfterChange) => {
  if (row === 'stays') {
    button.closest('li')?.focus()

    return
  }
  const headingId = button.closest('section')?.getAttribute('aria-labelledby')

  if (headingId) {
    document.getElementById(headingId)?.focus()
  }
}

export const useLoanChange = (rowAfterChange: RowAfterChange) => {
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (
    change: () => Promise<string | null>,
    button: HTMLElement
  ) => {
    if (isBusy) {
      return
    }
    setIsBusy(true)
    setError(null)
    const message = await change()

    setIsBusy(false)
    if (message === null) {
      focusAfterChange(button, rowAfterChange)

      return
    }
    setError(message)
  }

  return { isBusy, error, run }
}

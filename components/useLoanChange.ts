import { useState } from 'react'

// The button leaves the page on success, so focus would drop to <body>.
const focusHeadingOfSectionAround = (element: HTMLElement) => {
  const headingId = element.closest('section')?.getAttribute('aria-labelledby')

  if (headingId) {
    document.getElementById(headingId)?.focus()
  }
}

// For a button whose row leaves its section once the change works.
export const useLoanChange = () => {
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
      focusHeadingOfSectionAround(button)

      return
    }
    setError(message)
  }

  return { isBusy, error, run }
}

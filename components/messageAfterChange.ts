import { ConvexError } from 'convex/values'

// Resolves to a short message for the screen, or null when the change worked.
export const messageAfterChange = async (
  change: () => Promise<unknown>,
  fallback: string
) => {
  try {
    await change()

    return null
  } catch (error) {
    console.error('A change failed', error)
    // Only our ConvexError messages are written for people; anything else is not.
    if (error instanceof ConvexError && typeof error.data === 'string') {
      return error.data
    }

    return fallback
  }
}

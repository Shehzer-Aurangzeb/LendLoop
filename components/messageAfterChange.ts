import { ConvexError } from 'convex/values'

export const messageAfterChange = async (
  change: () => Promise<unknown>,
  fallback: string
) => {
  try {
    await change()

    return null
  } catch (error) {
    // Only our ConvexError messages are written for people; they are expected refusals, not bugs.
    if (error instanceof ConvexError && typeof error.data === 'string') {
      return error.data
    }
    console.error('A change failed', error)

    return fallback
  }
}

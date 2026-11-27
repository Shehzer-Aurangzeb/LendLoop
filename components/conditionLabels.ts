import type { Doc } from '@/convex/_generated/dataModel'

type Condition = Doc<'tools'>['condition']

export const conditionLabels: Record<Condition, string> = {
  'like-new': 'Like new',
  good: 'Good',
  worn: 'Worn',
}

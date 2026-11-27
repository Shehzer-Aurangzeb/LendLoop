import type { Doc } from '@/convex/_generated/dataModel'

export type Category = Doc<'tools'>['category']

export const categoryLabels: Record<Category, string> = {
  'power-tools': 'Power tools',
  'hand-tools': 'Hand tools',
  garden: 'Garden',
  kitchen: 'Kitchen',
  camping: 'Camping',
  other: 'Other',
}

import type { Doc } from '@/convex/_generated/dataModel'

export const categoryLabels: Record<Doc<'tools'>['category'], string> = {
  'power-tools': 'Power tools',
  'hand-tools': 'Hand tools',
  garden: 'Garden',
  kitchen: 'Kitchen',
  camping: 'Camping',
  other: 'Other',
}

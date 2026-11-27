import type { Category } from '@/components/categoryLabels'

type CategoryStyle = {
  iconPath: string
  tintClass: string
}

// Full class names, not built from the key, so Tailwind can find them.
export const categoryStyles: Record<Category, CategoryStyle> = {
  'power-tools': {
    iconPath: 'M3 8.5h11v5H3z M14 9.5h3.5 M17.5 10.5h3 M6.5 13.5l-1 6h4l1-6',
    tintClass: 'bg-tint-power-tools',
  },
  'hand-tools': {
    iconPath:
      'M13.5 3.5l7 7-2.5 2.5-7-7z M11 6l-7.5 7.5a1.8 1.8 0 0 0 0 2.5l.5.5a1.8 1.8 0 0 0 2.5 0L14 9',
    tintClass: 'bg-tint-hand-tools',
  },
  garden: {
    iconPath:
      'M12 21v-8 M12 13c0-4.5 3-8 8.5-8 0 5.5-3.5 8-8.5 8z M12 15.5c0-3.5-2.5-6-7-6 0 4.5 2.5 6 7 6z',
    tintClass: 'bg-tint-garden',
  },
  kitchen: {
    iconPath:
      'M4 10h16v2.5A6.5 6.5 0 0 1 13.5 19h-3A6.5 6.5 0 0 1 4 12.5z M2 10h20 M9 5.5v1.5 M12 4.5v2.5 M15 5.5v1.5',
    tintClass: 'bg-tint-kitchen',
  },
  camping: {
    iconPath: 'M2.5 20L12 4l9.5 16z M12 4v16 M8.5 20l3.5-6.5 3.5 6.5',
    tintClass: 'bg-tint-camping',
  },
  other: {
    iconPath: 'M3 7.5L12 3.5l9 4v9l-9 4-9-4z M3 7.5l9 4 9-4 M12 11.5v9',
    tintClass: 'bg-tint-other',
  },
}

import { categoryLabels } from '@/components/categoryLabels'
import type { Category } from '@/components/categoryLabels'

export type CategoryChoice = 'all' | Category

type CategoryFilterProps = {
  selected: CategoryChoice
  onSelect: (choice: CategoryChoice) => void
}

const choices: { value: CategoryChoice; label: string }[] = [
  { value: 'all', label: 'All' },
  // Object.entries widens keys to string, so the cast restores the category union.
  ...Object.entries(categoryLabels).map(([value, label]) => ({
    value: value as Category,
    label,
  })),
]

const CategoryFilter = ({ selected, onSelect }: CategoryFilterProps) => (
  <div
    role="group"
    aria-label="Filter by category"
    className="flex flex-wrap gap-2"
  >
    {choices.map(({ value, label }) => {
      const isActive = value === selected

      return (
        <button
          key={value}
          type="button"
          aria-pressed={isActive}
          onClick={() => onSelect(value)}
          className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm font-medium ${
            isActive
              ? 'border-ink bg-ink text-white'
              : 'border-line-strong bg-surface text-ink hover:bg-ground'
          }`}
        >
          {label}
        </button>
      )
    })}
  </div>
)

export default CategoryFilter

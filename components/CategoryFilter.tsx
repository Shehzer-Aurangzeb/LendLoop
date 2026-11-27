import { categoryLabels } from '@/components/categoryLabels'

type Category = keyof typeof categoryLabels

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
          className={`rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
            isActive
              ? 'border-black bg-black text-white'
              : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          {label}
        </button>
      )
    })}
  </div>
)

export default CategoryFilter

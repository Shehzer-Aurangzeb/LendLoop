type PillRadioGroupProps<T extends string> = {
  legend: string
  name: string
  labels: Record<T, string>
  selected: T
  onSelect: (value: T) => void
}

// Real radios, visually hidden, so arrow keys and screen readers work as usual.
const PillRadioGroup = <T extends string>({
  legend,
  name,
  labels,
  selected,
  onSelect,
}: PillRadioGroupProps<T>) => (
  <fieldset>
    <legend className="mb-2 text-sm font-medium text-ink-soft">{legend}</legend>
    <div className="flex flex-wrap gap-2">
      {/* Object.entries widens keys to string, so the cast restores the union. */}
      {(Object.entries(labels) as [T, string][]).map(([value, label]) => (
        <label
          key={value}
          className="flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong px-3.5 text-sm text-ink has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-accent"
        >
          <input
            type="radio"
            name={name}
            value={value}
            checked={value === selected}
            onChange={() => onSelect(value)}
            className="sr-only"
          />
          {label}
        </label>
      ))}
    </div>
  </fieldset>
)

export default PillRadioGroup

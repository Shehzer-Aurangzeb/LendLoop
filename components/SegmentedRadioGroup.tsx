type SegmentedRadioGroupProps<T extends string> = {
  legend: string
  name: string
  labels: Record<T, string>
  selected: T
  onSelect: (value: T) => void
}

// Real radios, visually hidden, so arrow keys and screen readers work as usual.
const SegmentedRadioGroup = <T extends string>({
  legend,
  name,
  labels,
  selected,
  onSelect,
}: SegmentedRadioGroupProps<T>) => {
  // Object.entries widens keys to string, so the cast restores the union.
  const options = Object.entries(labels) as [T, string][]

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink-soft">
        {legend}
      </legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-[14px] bg-track p-1">
        {options.map(([value, label]) => (
          <label
            key={value}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] p-2.5 text-sm text-ink-soft has-checked:bg-surface has-checked:font-semibold has-checked:text-ink has-checked:shadow-[0_1px_2px_rgb(30_38_33/0.12)] has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-accent"
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
}

export default SegmentedRadioGroup

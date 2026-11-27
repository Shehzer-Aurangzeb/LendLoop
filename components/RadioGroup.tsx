type RadioGroupLook = 'pills' | 'segmented'

type RadioGroupProps<T extends string> = {
  legend: string
  name: string
  labels: Record<T, string>
  selected: T
  onSelect: (value: T) => void
  look: RadioGroupLook
}

const focusRingClass =
  'has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-accent'

const lookClasses: Record<RadioGroupLook, { group: string; option: string }> = {
  pills: {
    group: 'flex flex-wrap gap-2',
    option:
      'flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong px-3.5 text-sm text-ink has-checked:border-ink has-checked:bg-ink has-checked:text-white',
  },
  segmented: {
    group:
      'grid auto-cols-fr grid-flow-col gap-1 rounded-[14px] bg-track p-1',
    option:
      'flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] p-2.5 text-sm text-ink-soft has-checked:bg-surface has-checked:font-semibold has-checked:text-ink has-checked:shadow-[0_1px_2px_rgb(30_38_33/0.12)]',
  },
}

// Real radios, visually hidden, so arrow keys and screen readers work as usual.
const RadioGroup = <T extends string>({
  legend,
  name,
  labels,
  selected,
  onSelect,
  look,
}: RadioGroupProps<T>) => {
  // Object.entries widens keys to string, so the cast restores the union.
  const options = Object.entries(labels) as [T, string][]
  const classes = lookClasses[look]

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink-soft">
        {legend}
      </legend>
      <div className={classes.group}>
        {options.map(([value, label]) => (
          <label key={value} className={`${classes.option} ${focusRingClass}`}>
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

export default RadioGroup

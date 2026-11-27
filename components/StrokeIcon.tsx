export const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5'
export const SHIELD_CHECK_PATH =
  'M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z M8.5 12l2.5 2.5 4.5-5'
export const CHEVRON_LEFT_PATH = 'M15 6l-6 6 6 6'
export const HOUSE_PATH =
  'M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'

type StrokeIconProps = {
  path: string
  strokeWidth: number
  className: string
}

const StrokeIcon = ({ path, strokeWidth, className }: StrokeIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d={path} />
  </svg>
)

export default StrokeIcon

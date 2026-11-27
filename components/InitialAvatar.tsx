type InitialAvatarProps = {
  firstName: string
  size: 'small' | 'large'
}

const sizeClasses = {
  small: 'size-7 text-[13px]',
  large: 'size-12 text-[19px]',
}

const InitialAvatar = ({ firstName, size }: InitialAvatarProps) => (
  <span
    aria-hidden="true"
    className={`flex items-center justify-center rounded-full bg-accent-soft font-semibold text-accent ${sizeClasses[size]}`}
  >
    {firstName.charAt(0)}
  </span>
)

export default InitialAvatar

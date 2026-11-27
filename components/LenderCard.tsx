import InitialAvatar from '@/components/InitialAvatar'
import StrokeIcon, { SHIELD_CHECK_PATH } from '@/components/StrokeIcon'

type LenderCardProps = {
  firstName: string
  isTrusted: boolean
}

const LenderCard = ({ firstName, isTrusted }: LenderCardProps) => (
  <div className="flex items-center gap-3.5 rounded-[18px] border border-line bg-surface p-[18px]">
    <InitialAvatar firstName={firstName} size="large" />
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-ink-muted">Lent by</span>
      <span className="text-[17px] font-semibold">{firstName}</span>
    </div>
    {isTrusted && (
      <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-semibold text-accent">
        <StrokeIcon
          path={SHIELD_CHECK_PATH}
          strokeWidth={2.3}
          className="size-[15px]"
        />
        Trusted Lender
      </span>
    )}
  </div>
)

export default LenderCard

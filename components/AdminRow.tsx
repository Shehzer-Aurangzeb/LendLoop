import type { ReactNode } from 'react'

type AdminRowProps = {
  title: string
  detail: string
  children: ReactNode
}

const AdminRow = ({ title, detail, children }: AdminRowProps) => (
  <li className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line bg-surface p-4">
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[17px] font-semibold break-words">{title}</span>
      <span className="text-sm text-ink-muted">{detail}</span>
    </div>
    <div className="flex flex-col items-end gap-1">{children}</div>
  </li>
)

export default AdminRow

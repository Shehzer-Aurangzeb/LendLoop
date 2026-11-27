import type { ReactNode } from 'react'

const LoanList = ({ children }: { children: ReactNode }) => (
  <ul className="divide-y divide-line rounded-[20px] border border-line bg-surface">
    {children}
  </ul>
)

export default LoanList

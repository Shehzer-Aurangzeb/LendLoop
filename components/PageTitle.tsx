import type { ReactNode } from 'react'

const PageTitle = ({ children }: { children: ReactNode }) => (
  <h1 className="font-display text-[38px] font-bold tracking-[-0.03em]">
    {children}
  </h1>
)

export default PageTitle

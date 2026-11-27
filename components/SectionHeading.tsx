import type { ReactNode } from 'react'

type SectionHeadingProps = {
  id: string
  children: ReactNode
}

const SectionHeading = ({ id, children }: SectionHeadingProps) => (
  <h2
    id={id}
    className="font-display text-2xl font-semibold tracking-[-0.02em]"
  >
    {children}
  </h2>
)

export default SectionHeading

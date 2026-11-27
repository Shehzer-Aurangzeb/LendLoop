import type { ReactNode } from 'react'

type SectionHeadingProps = {
  id: string
  children: ReactNode
}

const SectionHeading = ({ id, children }: SectionHeadingProps) => (
  // tabIndex -1: focus lands here when a row's button leaves the section.
  <h2
    id={id}
    tabIndex={-1}
    className="font-display text-2xl font-semibold tracking-[-0.02em]"
  >
    {children}
  </h2>
)

export default SectionHeading

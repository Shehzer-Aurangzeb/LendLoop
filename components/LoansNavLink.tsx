'use client'

import Link from 'next/link'
import WaitingCountBadge from '@/components/WaitingCountBadge'

const LoansNavLink = ({ className }: { className: string }) => (
  <Link href="/loans" className={`inline-flex gap-2 ${className}`}>
    Loans
    <WaitingCountBadge />
  </Link>
)

export default LoansNavLink

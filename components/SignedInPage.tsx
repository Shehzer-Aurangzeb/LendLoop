import type { ReactNode } from 'react'
import SiteFooter from '@/components/SiteFooter'
import SiteHeader from '@/components/SiteHeader'

const SignedInPage = ({ children }: { children: ReactNode }) => (
  <>
    <SiteHeader />
    <main className="page-container flex flex-1 flex-col gap-5 pt-10 pb-[72px]">
      {children}
    </main>
    <SiteFooter />
  </>
)

export default SignedInPage

import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
})

const description =
  "A shared shelf for your street. Borrow what you need, lend what you don't, and hand it back when you're done."

export const metadata: Metadata = {
  title: {
    default: 'LendLoop, borrow and lend tools with your neighbours',
    template: '%s · LendLoop',
  },
  description,
  applicationName: 'LendLoop',
  openGraph: {
    title: 'LendLoop',
    description,
    siteName: 'LendLoop',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#f8f6f1',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      // Keeps route changes instant while in-page links scroll smoothly.
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ground font-sans text-ink">
        <ClerkProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}

import { Suspense } from 'react'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'
import PublicToolList from '@/components/PublicToolList'
import PublicToolListErrorBoundary from '@/components/PublicToolListErrorBoundary'

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <header className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold">LendLoop</h1>
        <p className="text-zinc-600">
          Borrow what you need. Lend what you don&apos;t.
        </p>
        <Suspense>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-md bg-black px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                Sign in to lend or borrow
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </Suspense>
      </header>
      <section aria-labelledby="tools-heading" className="flex flex-col gap-4">
        <h2 id="tools-heading" className="text-xl font-semibold">
          Tools in the neighbourhood
        </h2>
        <PublicToolListErrorBoundary>
          <PublicToolList />
        </PublicToolListErrorBoundary>
      </section>
    </main>
  )
}

import { Suspense } from 'react'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'

// Setup check only. The real public page is built in its own feature.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">LendLoop</h1>
      <p className="text-zinc-600">
        Borrow what you need. Lend what you don&apos;t.
      </p>
      <Suspense>
        <Show when="signed-out">
          <SignInButton>
            <button className="rounded-md bg-black px-4 py-2 text-white">
              Sign in to lend or borrow
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </Suspense>
    </main>
  )
}

import { Suspense } from 'react'
import { Show, SignInButton } from '@clerk/nextjs'

type SignInCtaProps = {
  label: string
  look: 'outline' | 'primary'
}

const lookClasses = {
  outline:
    'min-h-11 border border-ink px-[18px] text-[15px] text-ink hover:bg-ink/5',
  primary:
    'min-h-12 bg-accent px-6 text-base text-white hover:bg-accent-strong',
}

const SignInCta = ({ label, look }: SignInCtaProps) => (
  <Suspense>
    <Show when="signed-out">
      <SignInButton
        mode="modal"
        forceRedirectUrl="/board"
        signUpForceRedirectUrl="/board"
      >
        <button
          type="button"
          className={`cursor-pointer rounded-full font-semibold ${lookClasses[look]}`}
        >
          {label}
        </button>
      </SignInButton>
    </Show>
  </Suspense>
)

export default SignInCta

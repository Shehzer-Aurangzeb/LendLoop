'use client'

import { useUser } from '@clerk/nextjs'

const BoardGreeting = () => {
  const { user } = useUser()

  return (
    <h1 className="font-display text-[38px] font-bold tracking-[-0.03em]">
      {user?.firstName ? `Hi, ${user.firstName}` : 'Hi there'}
    </h1>
  )
}

export default BoardGreeting

'use client'

import { useUser } from '@clerk/nextjs'
import PageTitle from '@/components/PageTitle'

const BoardGreeting = () => {
  const { user } = useUser()

  return (
    <PageTitle>
      {user?.firstName ? `Hi, ${user.firstName}` : 'Hi there'}
    </PageTitle>
  )
}

export default BoardGreeting

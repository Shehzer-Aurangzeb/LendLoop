import type { WithoutSystemFields } from 'convex/server'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { env, internalMutation } from './_generated/server'
import { findUserByToken } from './lib/auth'

type DemoUserKey = 'maya' | 'omar' | 'priya' | 'liam' | 'chen' | 'sofia'

type DemoTool = Omit<
  WithoutSystemFields<Doc<'tools'>>,
  'ownerId' | 'removedAt'
> & {
  owner: DemoUserKey
  isRemoved?: boolean
}

// Fake `seed|` token identifiers match no Clerk issuer, so nobody can sign in
// as these users.
const demoToken = (key: DemoUserKey) => `seed|${key}`

const demoUsers: Record<DemoUserKey, { isTrustedLender: boolean }> = {
  maya: { isTrustedLender: true },
  omar: { isTrustedLender: false },
  priya: { isTrustedLender: false },
  liam: { isTrustedLender: false },
  chen: { isTrustedLender: false },
  sofia: { isTrustedLender: false },
}

const demoTools = {
  drill: {
    owner: 'maya',
    name: 'Cordless drill',
    category: 'power-tools',
    condition: 'like-new',
    description: '18V drill with two batteries and a bit set.',
  },
  saw: {
    owner: 'omar',
    name: 'Circular saw',
    category: 'power-tools',
    condition: 'good',
    description: '7¼ inch blade. Bring your own safety glasses.',
  },
  sander: {
    owner: 'priya',
    name: 'Orbital sander',
    category: 'power-tools',
    condition: 'worn',
    description: 'Works fine, dust bag is a bit loose.',
  },
  sockets: {
    owner: 'maya',
    name: 'Socket set',
    category: 'hand-tools',
    condition: 'good',
    description: 'Metric and imperial, 40 pieces.',
  },
  hammer: {
    owner: 'liam',
    name: 'Claw hammer',
    category: 'hand-tools',
    condition: 'worn',
    description: 'Old but solid.',
  },
  level: {
    owner: 'chen',
    name: 'Spirit level',
    category: 'hand-tools',
    condition: 'like-new',
    description: '120 cm aluminium level.',
  },
  mower: {
    owner: 'sofia',
    name: 'Lawn mower',
    category: 'garden',
    condition: 'good',
    description: 'Electric push mower with a long cord.',
  },
  trimmer: {
    owner: 'maya',
    name: 'Hedge trimmer',
    category: 'garden',
    condition: 'worn',
    description: 'Cordless; battery lasts about 30 minutes.',
  },
  wheelbarrow: {
    owner: 'omar',
    name: 'Wheelbarrow',
    category: 'garden',
    condition: 'good',
    description: 'Single wheel, holds about 100 litres.',
  },
  mixer: {
    owner: 'priya',
    name: 'Stand mixer',
    category: 'kitchen',
    condition: 'like-new',
    description: 'Comes with dough hook and whisk.',
  },
  pastaMaker: {
    owner: 'chen',
    name: 'Pasta maker',
    category: 'kitchen',
    condition: 'good',
    description: 'Hand-crank roller and cutter.',
  },
  tent: {
    owner: 'liam',
    name: 'Four-person tent',
    category: 'camping',
    condition: 'good',
    description: 'Packs down small; takes 10 minutes to pitch.',
  },
  stove: {
    owner: 'sofia',
    name: 'Camp stove',
    category: 'camping',
    condition: 'like-new',
    description: 'Two burners; gas canister not included.',
  },
  ladder: {
    owner: 'omar',
    name: 'Folding ladder',
    category: 'other',
    condition: 'good',
    description: 'Reaches about 3 metres.',
  },
  carpetCleaner: {
    owner: 'chen',
    name: 'Carpet cleaner',
    category: 'other',
    condition: 'worn',
    description: 'Removed by an admin.',
    isRemoved: true,
  },
} satisfies Record<string, DemoTool>

type DemoToolKey = keyof typeof demoTools

type DemoLoan = Pick<Doc<'loans'>, 'status'> & {
  tool: DemoToolKey
  borrower: DemoUserKey
  start: number
  end: number
}

// `start` and `end` are days from today.
const demoLoans = {
  drillRequest: {
    tool: 'drill',
    borrower: 'omar',
    start: 5,
    end: 7,
    status: 'requested',
  },
  mixerRequest: {
    tool: 'mixer',
    borrower: 'sofia',
    start: 3,
    end: 4,
    status: 'requested',
  },
  tentRequest: {
    tool: 'tent',
    borrower: 'chen',
    start: 10,
    end: 13,
    status: 'requested',
  },
  mowerStartsToday: {
    tool: 'mower',
    borrower: 'liam',
    start: 0,
    end: 2,
    status: 'approved',
  },
  stoveUpcoming: {
    tool: 'stove',
    borrower: 'priya',
    start: 7,
    end: 9,
    status: 'approved',
  },
  sawOverdue: {
    tool: 'saw',
    borrower: 'maya',
    start: -6,
    end: -2,
    status: 'approved',
  },
  pastaMakerDeclined: {
    tool: 'pastaMaker',
    borrower: 'omar',
    start: 4,
    end: 5,
    status: 'declined',
  },
  socketsReturned: {
    tool: 'sockets',
    borrower: 'liam',
    start: -20,
    end: -17,
    status: 'returned',
  },
  wheelbarrowReturned: {
    tool: 'wheelbarrow',
    borrower: 'priya',
    start: -12,
    end: -10,
    status: 'returned',
  },
  carpetCleanerCancelled: {
    tool: 'carpetCleaner',
    borrower: 'sofia',
    start: 2,
    end: 3,
    status: 'cancelled',
  },
} satisfies Record<string, DemoLoan>

type DemoLoanKey = keyof typeof demoLoans

type DemoActivity = Pick<Doc<'loanActivity'>, 'kind' | 'outcome'> & {
  loan: DemoLoanKey
  day: number
}

// `day` is days from today.
const demoActivity: DemoActivity[] = [
  {
    loan: 'drillRequest',
    kind: 'request-notification',
    outcome: 'sent',
    day: -1,
  },
  {
    loan: 'mixerRequest',
    kind: 'request-notification',
    outcome: 'failed',
    day: -1,
  },
  {
    loan: 'tentRequest',
    kind: 'request-notification',
    outcome: 'sent',
    day: 0,
  },
  { loan: 'sawOverdue', kind: 'overdue-reminder', outcome: 'sent', day: -1 },
]

// The en-CA locale formats dates as YYYY-MM-DD.
const todayInTimezone = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())

// A date string is a calendar day, so UTC arithmetic avoids DST shifts.
const addDays = (date: string, days: number) => {
  const day = new Date(`${date}T00:00:00Z`)

  day.setUTCDate(day.getUTCDate() + days)

  return day.toISOString().slice(0, 10)
}

const capitalize = (word: string) => word[0].toUpperCase() + word.slice(1)

export const run = internalMutation({
  args: {},
  returns: v.union(v.literal('seeded'), v.literal('skipped')),
  handler: async (ctx) => {
    // Real sign-ins don't count, so the seed works before or after one.
    const isAlreadySeeded =
      (await findUserByToken(ctx, demoToken('maya'))) !== null

    if (isAlreadySeeded) {
      return 'skipped'
    }

    const today = todayInTimezone(env.APP_TIMEZONE)

    const userIds = {} as Record<DemoUserKey, Id<'users'>>

    for (const [key, { isTrustedLender }] of Object.entries(demoUsers)) {
      userIds[key as DemoUserKey] = await ctx.db.insert('users', {
        tokenIdentifier: demoToken(key as DemoUserKey),
        name: capitalize(key),
        email: `${key}@example.com`,
        role: 'user',
        isTrustedLender,
      })
    }

    const tools = {} as Record<
      DemoToolKey,
      Pick<Doc<'tools'>, '_id' | 'ownerId'>
    >
    const toolEntries = Object.entries(demoTools) as [DemoToolKey, DemoTool][]

    for (const [key, { owner, isRemoved, ...tool }] of toolEntries) {
      const ownerId = userIds[owner]
      const _id = await ctx.db.insert('tools', {
        ...tool,
        ownerId,
        removedAt: isRemoved ? Date.now() : undefined,
      })

      tools[key] = { _id, ownerId }
    }

    const loanIds = {} as Record<DemoLoanKey, Id<'loans'>>
    const loanEntries = Object.entries(demoLoans) as [DemoLoanKey, DemoLoan][]

    for (const [key, loan] of loanEntries) {
      const tool = tools[loan.tool]

      loanIds[key] = await ctx.db.insert('loans', {
        toolId: tool._id,
        borrowerId: userIds[loan.borrower],
        lenderId: tool.ownerId,
        startDate: addDays(today, loan.start),
        endDate: addDays(today, loan.end),
        status: loan.status,
      })
    }

    for (const { loan, day, ...activity } of demoActivity) {
      await ctx.db.insert('loanActivity', {
        ...activity,
        loanId: loanIds[loan],
        date: addDays(today, day),
      })
    }

    return 'seeded'
  },
})

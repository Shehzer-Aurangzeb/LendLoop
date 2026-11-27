import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import { describe, expect, test } from 'vitest'
import { api } from '@/convex/_generated/api'
import schema from '@/convex/schema'

const modules = import.meta.glob('./**/*.ts')

const neighbour = { name: 'Asha', email: 'asha@example.com' }

describe('users.store', () => {
  test('first call creates one user with role user and not trusted', async () => {
    const t = convexTest(schema, modules)
    const id = await t.withIdentity(neighbour).mutation(api.users.store)

    const users = await t.run((ctx) => ctx.db.query('users').collect())

    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({
      _id: id,
      name: 'Asha',
      email: 'asha@example.com',
      role: 'user',
      isTrustedLender: false,
    })
  })

  test('second call returns the same id and adds no row', async () => {
    const t = convexTest(schema, modules)
    const asNeighbour = t.withIdentity(neighbour)
    const firstId = await asNeighbour.mutation(api.users.store)
    const secondId = await asNeighbour.mutation(api.users.store)

    const users = await t.run((ctx) => ctx.db.query('users').collect())

    expect(secondId).toBe(firstId)
    expect(users).toHaveLength(1)
  })

  test('does not reset role or isTrustedLender of an existing user', async () => {
    const t = convexTest(schema, modules)
    const asNeighbour = t.withIdentity(neighbour)
    const id = await asNeighbour.mutation(api.users.store)

    await t.run((ctx) =>
      ctx.db.patch(id, { role: 'admin', isTrustedLender: true })
    )

    await asNeighbour.mutation(api.users.store)

    const user = await t.run((ctx) => ctx.db.get(id))

    expect(user).toMatchObject({ role: 'admin', isTrustedLender: true })
  })

  test('identity with no name is stored as Neighbour', async () => {
    const t = convexTest(schema, modules)
    const id = await t.withIdentity({}).mutation(api.users.store)

    const user = await t.run((ctx) => ctx.db.get(id))

    expect(user?.name).toBe('Neighbour')
  })

  test('whitespace-only name is stored as Neighbour', async () => {
    const t = convexTest(schema, modules)
    const id = await t.withIdentity({ name: '   ' }).mutation(api.users.store)

    const user = await t.run((ctx) => ctx.db.get(id))

    expect(user?.name).toBe('Neighbour')
  })

  test('signed-out call throws a ConvexError', async () => {
    const t = convexTest(schema, modules)
    const error = await t.mutation(api.users.store).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ConvexError)
    expect((error as ConvexError<string>).data).toBe('Please sign in.')
  })
})

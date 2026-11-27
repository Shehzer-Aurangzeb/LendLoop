import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import { describe, expect, test } from 'vitest'
import schema from '@/convex/schema'
import { requireAdmin, requireIdentity, requireUser } from '@/convex/lib/auth'

// A glob, not an import: convex-test needs every convex/ module, and globs
// are relative to this file.
const modules = import.meta.glob('../**/*.ts')

const neighbour = { name: 'Asha', tokenIdentifier: 'test|asha' }

const insertUser = (
  t: ReturnType<typeof convexTest>,
  role: 'user' | 'admin'
) =>
  t.run((ctx) =>
    ctx.db.insert('users', {
      tokenIdentifier: neighbour.tokenIdentifier,
      name: neighbour.name,
      role,
      isTrustedLender: false,
    })
  )

const errorMessageOf = async (promise: Promise<unknown>) => {
  const error = await promise.catch((e: unknown) => e)

  expect(error).toBeInstanceOf(ConvexError)

  return (error as ConvexError<string>).data
}

describe('signed out', () => {
  test('requireIdentity throws the sign-in error', async () => {
    const t = convexTest(schema, modules)

    expect(await errorMessageOf(t.run((ctx) => requireIdentity(ctx)))).toBe(
      'Please sign in'
    )
  })

  test('requireUser throws the sign-in error', async () => {
    const t = convexTest(schema, modules)

    expect(await errorMessageOf(t.run((ctx) => requireUser(ctx)))).toBe(
      'Please sign in'
    )
  })

  test('requireAdmin throws the sign-in error', async () => {
    const t = convexTest(schema, modules)

    expect(await errorMessageOf(t.run((ctx) => requireAdmin(ctx)))).toBe(
      'Please sign in'
    )
  })
})

describe('signed in', () => {
  test('requireIdentity returns the identity without a users row', async () => {
    const t = convexTest(schema, modules)
    const identity = await t
      .withIdentity(neighbour)
      .run((ctx) => requireIdentity(ctx))

    expect(identity.tokenIdentifier).toBe(neighbour.tokenIdentifier)
  })

  test('requireUser throws not-registered with no users row', async () => {
    const t = convexTest(schema, modules)
    const asNeighbour = t.withIdentity(neighbour)

    expect(
      await errorMessageOf(asNeighbour.run((ctx) => requireUser(ctx)))
    ).toBe('Your account is not set up yet')
  })

  test('requireUser returns the row of a normal user', async () => {
    const t = convexTest(schema, modules)
    const id = await insertUser(t, 'user')
    const user = await t.withIdentity(neighbour).run((ctx) => requireUser(ctx))

    expect(user._id).toBe(id)
  })

  test('requireAdmin refuses a normal user', async () => {
    const t = convexTest(schema, modules)

    await insertUser(t, 'user')

    const asNeighbour = t.withIdentity(neighbour)

    expect(
      await errorMessageOf(asNeighbour.run((ctx) => requireAdmin(ctx)))
    ).toBe('Admins only')
  })

  test('requireAdmin returns the row of an admin', async () => {
    const t = convexTest(schema, modules)
    const id = await insertUser(t, 'admin')
    const admin = await t
      .withIdentity(neighbour)
      .run((ctx) => requireAdmin(ctx))

    expect(admin._id).toBe(id)
  })
})

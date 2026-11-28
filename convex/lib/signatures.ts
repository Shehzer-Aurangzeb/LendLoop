const maxAgeMs = 5 * 60_000
// Small clock drift between the n8n container and Convex should not reject a real request.
const maxClockAheadMs = 60_000

export const hmacSha256Hex = async (secret: string, body: string) => {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))

  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

// `===` stops at the first wrong character, which leaks how much of a guess matched.
const isSameTextInConstantTime = (a: string, b: string) => {
  if (a.length !== b.length) {
    return false
  }
  let difference = 0

  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return difference === 0
}

const isFreshSentAt = (sentAt: unknown) =>
  typeof sentAt === 'number' &&
  sentAt >= Date.now() - maxAgeMs &&
  sentAt <= Date.now() + maxClockAheadMs

// Refusals carry no detail, so a caller learns nothing.
export const readSignedJsonBody = async (
  request: Request
): Promise<{ body: Record<string, unknown> } | { refusal: Response }> => {
  // Read here, not declared in convex.config.ts, so Convex still deploys without n8n.
  const secret = process.env.CONVEX_WEBHOOK_SECRET

  if (!secret) {
    console.error('Signed request refused: CONVEX_WEBHOOK_SECRET is not set.')

    return { refusal: new Response(null, { status: 500 }) }
  }

  // Hash the raw text, never re-serialised JSON: the bytes must match what was signed.
  const rawBody = await request.text()
  const signature = request.headers.get('X-LendLoop-Signature') ?? ''
  const expectedSignature = await hmacSha256Hex(secret, rawBody)

  if (!isSameTextInConstantTime(signature, expectedSignature)) {
    return { refusal: new Response(null, { status: 401 }) }
  }

  let body: unknown

  try {
    body = JSON.parse(rawBody)
  } catch {
    return { refusal: new Response(null, { status: 400 }) }
  }

  if (typeof body !== 'object' || body === null) {
    return { refusal: new Response(null, { status: 400 }) }
  }

  if (!('sentAt' in body) || !isFreshSentAt(body.sentAt)) {
    return { refusal: new Response(null, { status: 401 }) }
  }

  return { body: body as Record<string, unknown> }
}

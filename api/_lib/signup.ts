/*
  Sign-up core, shared by the Vercel function (api/signup.ts) and the local
  Vite dev/preview middleware (vite.config.ts). Files under api/_lib are not
  deployed as their own routes because of the leading underscore.

  Flow: validate -> rate limit -> create (or fetch) the Photon shared user ->
  read the sms: deep link from the public redirect endpoint -> reply with
  { assignedNumber, smsLink }.

  Privacy: the project secret is never returned or logged, and phone numbers
  are logged as their last 4 digits only.
*/
import { z } from 'zod'

const SPECTRUM = 'https://spectrum.photon.codes'

export interface SignupResult {
  status: number
  body: Record<string, unknown>
  headers?: Record<string, string>
}

/* ---------- validation ---------- */

/** Normalizes a US number typed in any common format to E.164 (+1XXXXXXXXXX). */
export function toE164US(raw: string): string | null {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1)
  if (digits.length !== 10) return null
  // NANP: area code and exchange cannot start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null
  return `+1${digits}`
}

const Body = z.object({
  phone: z
    .string()
    .max(32)
    .transform((v, ctx) => {
      const e164 = toE164US(v)
      if (!e164) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'phone' })
        return z.NEVER
      }
      return e164
    }),
  adult: z.literal(true, { errorMap: () => ({ message: 'adult' }) }),
  // Honeypot: real people never see this field, so it must stay empty.
  website: z.string().max(0, 'honeypot').optional().default(''),
})

const last4 = (e164: string) => `***${e164.slice(-4)}`

/* ---------- rate limiting ----------
   Fixed windows held in memory. A warm serverless instance keeps them between
   requests, but they reset on cold starts and are not shared across regions or
   instances. For durable limits, swap these maps for Vercel KV or Upstash Redis
   (INCR + EXPIRE on the same keys). */

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const PER_IP_LIMIT = 3
const GLOBAL_DAILY_LIMIT = 40

interface Window { count: number; resetAt: number }
const ipWindows = new Map<string, Window>()
const globalWindow: Window = { count: 0, resetAt: 0 }

function hit(win: Window, limit: number, span: number, now: number): { ok: boolean; retryAfter: number } {
  if (now >= win.resetAt) { win.count = 0; win.resetAt = now + span }
  if (win.count >= limit) return { ok: false, retryAfter: Math.ceil((win.resetAt - now) / 1000) }
  win.count++
  return { ok: true, retryAfter: 0 }
}

function rateLimit(ip: string, now = Date.now()): { ok: boolean; retryAfter: number } {
  // Drop expired entries so the map cannot grow without bound.
  if (ipWindows.size > 5000) for (const [k, w] of ipWindows) if (now >= w.resetAt) ipWindows.delete(k)
  let w = ipWindows.get(ip)
  if (!w) { w = { count: 0, resetAt: 0 }; ipWindows.set(ip, w) }
  const perIp = hit(w, PER_IP_LIMIT, HOUR, now)
  if (!perIp.ok) return perIp
  return hit(globalWindow, GLOBAL_DAILY_LIMIT, DAY, now)
}

/* ---------- Photon Spectrum ---------- */

interface PhotonUser { id: string; phoneNumber?: string; assignedPhoneNumber?: string }

const asUser = (v: unknown): PhotonUser | null => {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const inner = (o.data && typeof o.data === 'object' && !Array.isArray(o.data) ? o.data : o) as Record<string, unknown>
  return typeof inner.id === 'string' ? (inner as unknown as PhotonUser) : null
}

const asUserList = (v: unknown): PhotonUser[] => {
  if (Array.isArray(v)) return v as PhotonUser[]
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    for (const key of ['data', 'users', 'items']) {
      const inner = o[key]
      if (Array.isArray(inner)) return inner as PhotonUser[]
      if (inner && typeof inner === 'object') {
        const deeper = asUserList(inner)
        if (deeper.length) return deeper
      }
    }
  }
  return []
}

async function findOrCreateUser(projectId: string, secret: string, phone: string): Promise<PhotonUser> {
  const auth = 'Basic ' + Buffer.from(`${projectId}:${secret}`).toString('base64')
  const base = `${SPECTRUM}/projects/${encodeURIComponent(projectId)}/users/`

  // Creating a shared user is idempotent on phoneNumber per Photon's docs:
  // re-creating an existing active number returns the same user.
  const created = await fetch(base, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ type: 'shared', phoneNumber: phone }),
  })
  if (created.ok) {
    const user = asUser(await created.json().catch(() => null))
    if (user) return user
  }

  // Fallback: if create failed (for example a conflict), look the number up.
  const status = created.status
  const listed = await fetch(base, { headers: { Authorization: auth, Accept: 'application/json' } })
  if (listed.ok) {
    const match = asUserList(await listed.json().catch(() => null)).find((u) => u?.phoneNumber === phone)
    if (match?.id) return match
  }
  throw new PhotonError(`create failed with ${status}, list ${listed.status}`, status)
}

async function smsLinkFor(userId: string): Promise<string> {
  const res = await fetch(`${SPECTRUM}/users/${encodeURIComponent(userId)}/redirect`, { redirect: 'manual' })
  const location = res.headers.get('location')
  if (!location || !/^sms:/i.test(location)) throw new PhotonError(`redirect gave ${res.status}`, res.status)
  return location
}

class PhotonError extends Error {
  constructor(message: string, readonly upstreamStatus: number) { super(message) }
}

/** Pulls the E.164 number out of an sms: link such as sms:+15551234567&body=Hi */
export function numberFromSmsLink(link: string): string | null {
  const m = /^sms:(?:\/\/)?(\+?\d{10,15})/i.exec(link)
  return m ? (m[1].startsWith('+') ? m[1] : `+${m[1]}`) : null
}

/* ---------- handler ---------- */

export interface SignupEnv {
  PHOTON_PROJECT_ID?: string
  PHOTON_PROJECT_SECRET?: string
  /** True when running on Vercel. Mock mode is never allowed there. */
  onVercel: boolean
}

export interface SignupRequest {
  method: string
  ip: string
  headers: { get(name: string): string | null }
  json: () => Promise<unknown>
}

const fail = (status: number, error: string, message: string, headers?: Record<string, string>): SignupResult =>
  ({ status, body: { error, message }, headers })

export async function handleSignup(req: SignupRequest, env: SignupEnv): Promise<SignupResult> {
  if (req.method !== 'POST') return fail(405, 'method', 'Use POST.', { Allow: 'POST' })

  // Cheap header check before any work: the page's fetch always sends JSON and
  // this marker header. Plain form posts and most drive-by bots do not.
  const type = req.headers.get('content-type') ?? ''
  if (!type.includes('application/json') || req.headers.get('x-batman-signup') !== '1') {
    return fail(400, 'bad_request', 'That request did not come from the sign-up form.')
  }

  let raw: unknown
  try { raw = await req.json() } catch { return fail(400, 'bad_request', 'That request was not valid JSON.') }

  const parsed = Body.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message)
    if (issues.includes('honeypot')) {
      // Pretend success to bots without doing anything.
      return { status: 200, body: { ok: true } }
    }
    if (issues.includes('phone')) return fail(422, 'phone', 'That does not look like a US mobile number. Try 10 digits, like 919 555 0123.')
    if (issues.includes('adult')) return fail(422, 'adult', 'Batman is for adults. Please confirm you are 18 or older.')
    return fail(422, 'invalid', 'Something in the form needs another look.')
  }
  const { phone } = parsed.data

  const limit = rateLimit(req.ip)
  if (!limit.ok) {
    return fail(429, 'rate_limited', 'Lots of sign-ups right now. Please try again in a little while.', {
      'Retry-After': String(limit.retryAfter),
    })
  }

  const { PHOTON_PROJECT_ID: id, PHOTON_PROJECT_SECRET: secret } = env
  if (!id || !secret) {
    if (env.onVercel) {
      console.error('[signup] Photon env vars are missing')
      return fail(503, 'unconfigured', 'Sign-up is not open yet. Please check back soon.')
    }
    // Local development only: a clearly labeled fake so the page can be demoed.
    console.info(`[signup] MOCK sign-up for ${last4(phone)}`)
    const mock = '+15555550142'
    return {
      status: 200,
      body: { assignedNumber: mock, smsLink: `sms:${mock}`, mock: true },
    }
  }

  try {
    const user = await findOrCreateUser(id, secret, phone)
    const smsLink = await smsLinkFor(user.id)
    const assignedNumber = numberFromSmsLink(smsLink) ?? user.assignedPhoneNumber ?? null
    if (!assignedNumber) throw new PhotonError('no assigned number', 422)
    console.info(`[signup] ok for ${last4(phone)}`)
    return { status: 200, body: { assignedNumber, smsLink } }
  } catch (err) {
    const detail = err instanceof PhotonError ? `${err.message} (upstream ${err.upstreamStatus})` : 'network error'
    console.error(`[signup] Photon error for ${last4(phone)}: ${detail}`)
    return fail(502, 'upstream', 'Batman could not set up your number just now. Please try again in a minute.')
  }
}

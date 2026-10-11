/*
  POST /api/signup
  Vercel Function (Node.js runtime, Web-standard Request/Response, no framework).
  Body: { phone: string, adult: true, website: "" }
  200:  { assignedNumber: "+1...", smsLink: "sms:..." }
  4xx/5xx: { error, message } with a friendly message for the page to show.
*/
import { handleSignup } from './_lib/signup.js'

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] ?? request.headers.get('x-real-ip') ?? 'unknown').trim()
}

async function run(request: Request): Promise<Response> {
  const result = await handleSignup(
    { method: request.method, ip: clientIp(request), headers: request.headers, json: () => request.json() },
    {
      PHOTON_PROJECT_ID: process.env.PHOTON_PROJECT_ID,
      PHOTON_PROJECT_SECRET: process.env.PHOTON_PROJECT_SECRET,
      onVercel: Boolean(process.env.VERCEL),
    },
  )
  return json(result.status, result.body, result.headers)
}

export function POST(request: Request): Promise<Response> {
  return run(request)
}

export function GET(request: Request): Promise<Response> {
  return run(request)
}

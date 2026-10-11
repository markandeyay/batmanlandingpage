// Exercises the sign-up core with a mocked Photon API: node qa/api-check.mjs
import assert from 'node:assert/strict'
const { handleSignup, toE164US, numberFromSmsLink } = await import('../api/_lib/signup.ts')

const calls = []
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), method: init.method ?? 'GET', auth: init.headers?.Authorization })
  if (String(url).endsWith('/users/') && init.method === 'POST') {
    return new Response(JSON.stringify({ succeed: true, data: { id: 'u-1', phoneNumber: '+19195550123', assignedPhoneNumber: '+14155550000' } }), { status: 200 })
  }
  if (String(url).includes('/redirect')) {
    assert.equal(init.redirect, 'manual')
    return new Response(null, { status: 302, headers: { Location: 'sms:+14155550000&body=Hi%20Batman' } })
  }
  return new Response('{}', { status: 404 })
}
const req = (body, ip = '1.1.1.1', headers = { 'content-type': 'application/json', 'x-batman-signup': '1' }) => ({
  method: 'POST', ip, headers: { get: (n) => headers[n.toLowerCase()] ?? null }, json: async () => body,
})
const env = { PHOTON_PROJECT_ID: 'proj', PHOTON_PROJECT_SECRET: 'shh', onVercel: true }

assert.equal(toE164US('(919) 555-0123'), '+19195550123')
assert.equal(toE164US('+1 919 555 0123'), '+19195550123')
assert.equal(toE164US('123 555 0123'), null)
assert.equal(numberFromSmsLink('sms:+14155550000&body=x'), '+14155550000')

let r = await handleSignup(req({ phone: '9195550123', adult: true }, '1.1.1.1', { 'content-type': 'application/json' }), env)
assert.equal(r.status, 400, 'missing marker header')
r = await handleSignup(req({ phone: '9195550123', adult: false }), env)
assert.equal(r.status, 422); assert.equal(r.body.error, 'adult')
r = await handleSignup(req({ phone: '555', adult: true }), env)
assert.equal(r.body.error, 'phone')
r = await handleSignup(req({ phone: '9195550123', adult: true, website: 'spam' }), env)
assert.deepEqual(r.body, { ok: true }); assert.equal(calls.length, 0, 'honeypot never reaches Photon')

r = await handleSignup(req({ phone: '(919) 555-0123', adult: true }), env)
assert.equal(r.status, 200)
assert.deepEqual(r.body, { assignedNumber: '+14155550000', smsLink: 'sms:+14155550000&body=Hi%20Batman' })
assert.equal(calls[0].url, 'https://spectrum.photon.codes/projects/proj/users/')
assert.equal(calls[0].auth, 'Basic ' + Buffer.from('proj:shh').toString('base64'))
assert.equal(calls[1].url, 'https://spectrum.photon.codes/users/u-1/redirect')
assert.ok(!JSON.stringify(r.body).includes('shh'), 'secret never returned')

// per-IP: 3 per hour (1 used above)
for (let i = 0; i < 2; i++) assert.equal((await handleSignup(req({ phone: '9195550123', adult: true }), env)).status, 200)
r = await handleSignup(req({ phone: '9195550123', adult: true }), env)
assert.equal(r.status, 429); assert.ok(Number(r.headers['Retry-After']) > 0)

// unconfigured on Vercel -> 503, locally -> labeled mock
assert.equal((await handleSignup(req({ phone: '9195550123', adult: true }, '2.2.2.2'), { onVercel: true })).status, 503)
r = await handleSignup(req({ phone: '9195550123', adult: true }, '2.2.2.2'), { onVercel: false })
assert.equal(r.body.mock, true)
console.log('api-check: all assertions passed')

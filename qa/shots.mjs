/*
  QA: builds the site, serves it with `vite preview`, and saves screenshots to qa/shots/.
    - full-page at 375 px and 1440 px (motion on, after scrolling through once)
    - full-page at 375 px and 1440 px with prefers-reduced-motion: reduce
    - frames through the pinned conversation at both widths
    - the sign-up success state (local mock)
  Also checks: no horizontal scroll at 375 px, CLS, LCP, and that no copy contains an em dash.
  Usage: npm run qa   (pass --no-build to reuse dist/)
*/
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from 'playwright'

const PORT = 4319
const BASE = `http://localhost:${PORT}`
const OUT = new URL('./shots/', import.meta.url)
mkdirSync(OUT, { recursive: true })
const out = (name) => new URL(name, OUT).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const shell = process.platform === 'win32'

if (!process.argv.includes('--no-build')) {
  const b = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell })
  if (b.status !== 0) process.exit(b.status ?? 1)
}

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
if (html.includes('—')) { console.error('FAIL: em dash found in dist/index.html'); process.exitCode = 1 }

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { shell, stdio: 'pipe' })
const stopServer = () => { try { shell ? spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']) : server.kill() } catch {} }
process.on('exit', stopServer)

for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break } catch {}
  await sleep(250)
}

const browser = await chromium.launch()
const results = []

async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 300) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await sleep(40)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await sleep(600)
}

async function run(width, height, reduced) {
  const tag = `${width}${reduced ? '-reduced' : ''}`
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: width < 500 ? 2 : 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    hasTouch: width < 500,
    isMobile: width < 500,
  })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    window.__cls = 0
    window.__lcp = 0
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await sleep(1200)
  await page.screenshot({ path: out(`hero-${tag}.png`) })

  const metrics = await page.evaluate(() => ({
    cls: window.__cls, lcp: Math.round(window.__lcp),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    motionReady: document.documentElement.classList.contains('motion-ready'),
  }))

  // Frames through the pinned conversation.
  if (!reduced) {
    const box = await page.evaluate(() => {
      const r = document.querySelector('[data-chat]').getBoundingClientRect()
      return { top: r.top + scrollY, h: r.height, vh: innerHeight }
    })
    const range = box.h - box.vh
    for (const p of [0.12, 0.3, 0.55, 0.8, 0.98]) {
      await page.evaluate((y) => window.scrollTo(0, y), box.top + range * p)
      await sleep(900)
      await page.screenshot({ path: out(`chat-${tag}-${Math.round(p * 100)}.png`) })
    }
  }

  await scrollThrough(page)
  await page.screenshot({ path: out(`full-${tag}.png`), fullPage: true })

  // Sign-up: one friendly error, then the mock success state.
  await page.locator('#get').scrollIntoViewIfNeeded()
  await page.click('[data-submit]')
  await sleep(300)
  await page.locator('.get__card').screenshot({ path: out(`signup-errors-${tag}.png`) })
  await page.fill('#phone', '9195550123')
  await page.check('#adult')
  const formatted = await page.inputValue('#phone')
  await page.click('[data-submit]')
  await page.waitForSelector('[data-result]:not([hidden])', { timeout: 5000 })
  await sleep(700)
  await page.locator('.get').screenshot({ path: out(`signup-done-${tag}.png`) })
  const smsHref = await page.getAttribute('[data-sms]', 'href')

  results.push({ tag, ...metrics, formatted, smsHref, errors })
  await ctx.close()
}

try {
  await run(375, 812, false)
  await run(1440, 900, false)
  await run(375, 812, true)
  await run(1440, 900, true)
} finally {
  await browser.close()
  stopServer()
}

console.table(results.map(({ errors, ...r }) => ({ ...r, errors: errors.length })))
for (const r of results) {
  if (r.overflowX > 0) { console.error(`FAIL ${r.tag}: horizontal overflow ${r.overflowX}px`); process.exitCode = 1 }
  if (r.cls > 0.02) { console.error(`FAIL ${r.tag}: CLS ${r.cls}`); process.exitCode = 1 }
  if (r.errors.length) { console.error(`FAIL ${r.tag}: console errors`, r.errors); process.exitCode = 1 }
}
console.log(`Screenshots in ${out('')}`)
process.exit(process.exitCode ?? 0)

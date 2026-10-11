// Saves the full page as a series of readable slices: node qa/segments.mjs <url> <width> [reduced]
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
const [url = 'http://localhost:4320', w = '375', reduced] = process.argv.slice(2)
const width = +w
mkdirSync('qa/shots/segments', { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: reduced ? 'reduce' : 'no-preference' })
const page = await ctx.newPage()
await page.goto(url, { waitUntil: 'networkidle' })
await page.addStyleTag({ content: '[data-reveal="scrub"]{animation:none!important}' })
const h = await page.evaluate(() => document.documentElement.scrollHeight)
for (let y = 0; y < h; y += 300) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(30) }
await page.evaluate(() => scrollTo(0, 0))
await page.waitForTimeout(800)
const slice = width < 500 ? 1400 : 1100
for (let y = 0, i = 0; y < h; y += slice, i++) {
  await page.screenshot({ path: `qa/shots/segments/${w}${reduced ? '-reduced' : ''}-${String(i).padStart(2, '0')}.png`, fullPage: true, clip: { x: 0, y, width, height: Math.min(slice, h - y) } })
}
console.log('height', h)
await browser.close()

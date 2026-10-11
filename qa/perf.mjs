// Throttled load check (about Lighthouse "slow 4G" + 4x CPU) against a running preview.
// Usage: npx vite preview --port 4320 & node qa/perf.mjs [url]
import { chromium } from 'playwright'
const url = process.argv[2] ?? 'http://localhost:4320'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
await page.addInitScript(() => {
  window.__cls = 0
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
  new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) { window.__lcp = e.startTime; window.__lcpEl = e.element?.tagName } }).observe({ type: 'largest-contentful-paint', buffered: true })
})
const bytes = { js: 0, css: 0, font: 0, img: 0, doc: 0 }
page.on('response', async (r) => {
  const t = r.request().resourceType()
  const len = Number((await r.allHeaders())['content-length'] ?? 0)
  if (t === 'script') bytes.js += len; else if (t === 'stylesheet') bytes.css += len; else if (t === 'font') bytes.font += len; else if (t === 'image') bytes.img += len; else if (t === 'document') bytes.doc += len
})
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(3000)
const m = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), lcpEl: window.__lcpEl, cls: window.__cls, fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0) }))
console.log({ ...m, transferred: bytes })
await browser.close()

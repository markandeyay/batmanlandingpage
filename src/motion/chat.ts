import { onScroll } from './scroll'

/*
  Pinned conversation. Scroll position decides when a step happens; each step
  then plays on a fixed CSS clock, so nothing is ever left half drawn.
  Several elements may share a step number (a time stamp lands with its message).
*/
const LEAD = 0.06      // the phone settles in first
const SPAN = 0.8       // every step has landed by 86 %, then a calm hold
const TYPING_AT = 0.4  // typing dots from 40 % of the slot before a Batman bubble
const FOLLOW_PAD = 14  // px of room under the newest item
const TYPING_H = 40    // room the typing bubble needs below the last item

interface Step { els: HTMLElement[]; bat: boolean; no: number }

export interface ChatScene {
  update: (progress: number) => void
  measure: () => void
  setLive: (live: boolean) => void
  stepCount: number
}

export function createChatScene(root: HTMLElement): ChatScene {
  const screen = root.querySelector<HTMLElement>('[data-chat-screen]')!
  const thread = root.querySelector<HTMLElement>('[data-chat-thread]')!
  const typing = root.querySelector<HTMLElement>('[data-chat-typing]')
  const clock = root.querySelector<HTMLElement>('[data-chat-clock]')
  const caps = Array.from(root.querySelectorAll<HTMLElement>('[data-cap]'))
  const capClock = caps.map((c) => (c.querySelector('time')?.textContent ?? '').replace(/\s*[AP]M$/, ''))

  const byNo = new Map<number, HTMLElement[]>()
  thread.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => {
    const no = Number(el.dataset.step)
    byNo.set(no, [...(byNo.get(no) ?? []), el])
  })
  const steps: Step[] = [...byNo.keys()].sort((a, b) => a - b).map((no) => {
    const els = byNo.get(no)!
    return { els, no, bat: els.some((e) => e.dataset.kind === 'bat') }
  })
  const n = steps.length

  let shown = -1
  let typingOn = false
  let activeCap = -2
  let live = false
  let viewH = 0
  let base = 0          // bottom of the always-visible content (first time stamp)
  let reach: number[] = [] // reach[i] = lowest edge once steps 0..i are shown

  /* Geometry is read once per resize or font load, never per frame. */
  const measure = () => {
    viewH = screen.clientHeight
    // offsetTop ignores transforms, so hidden bubbles (translated, scaled) measure true.
    // The thread sits at the top of the positioned screen, so offsets are thread relative.
    const firstStatic = thread.querySelector<HTMLElement>(':scope > li:not([data-step])')
    base = firstStatic ? firstStatic.offsetTop + firstStatic.offsetHeight : 0
    let max = base
    reach = steps.map((s) => {
      for (const el of s.els) {
        const host = el.closest<HTMLElement>('.thread > li') ?? el
        max = Math.max(max, host.offsetTop + host.offsetHeight)
      }
      return max
    })
    follow(shown, typingOn)
  }

  const follow = (i: number, withTyping: boolean) => {
    const bottom = i >= 0 ? reach[i] : base
    const need = bottom + (withTyping ? TYPING_H : 0)
    const offset = Math.max(0, need - viewH + FOLLOW_PAD)
    thread.style.transform = `translate3d(0, ${-offset}px, 0)`
    if (typing) typing.style.transform = `translate3d(0, ${bottom - offset + 8}px, 0)`
  }

  const show = (i: number) => {
    if (i === shown) return
    const lo = Math.min(i, shown) + 1
    const hi = Math.max(i, shown)
    for (let k = Math.max(0, lo); k <= hi; k++) {
      for (const el of steps[k].els) el.classList.toggle('is-shown', k <= i)
    }
    shown = i

    const stepNo = i >= 0 ? steps[i].no : 1
    let cap = 0
    caps.forEach((c, idx) => { if (Number(c.dataset.cap) <= stepNo) cap = idx })
    if (cap !== activeCap) {
      caps[activeCap]?.classList.remove('is-active')
      caps[cap]?.classList.add('is-active')
      if (clock && capClock[cap]) clock.textContent = capClock[cap]
      activeCap = cap
    }
  }

  const update = (p: number) => {
    const raw = ((p - LEAD) / SPAN) * n
    const i = Math.max(-1, Math.min(n - 1, Math.floor(raw)))
    const wantTyping = i + 1 < n && steps[i + 1].bat && raw - i >= TYPING_AT
    const changed = i !== shown || wantTyping !== typingOn
    show(i)
    if (typing && wantTyping !== typingOn) {
      typingOn = wantTyping
      typing.classList.toggle('is-on', wantTyping)
    }
    if (changed) follow(shown, typingOn)
  }

  const setLive = (on: boolean) => {
    if (on === live) return
    live = on
    root.classList.toggle('is-live', on)
    document.documentElement.classList.toggle('chat-live', on)
  }

  show(-1)
  return { update, measure, setLive, stepCount: n }
}

/* Default driver: sticky pin plus the shared scroll bus. */
export function nativeChatDriver(root: HTMLElement, scene: ChatScene): () => void {
  const stage = root.querySelector<HTMLElement>('.chat__stage')!
  let top = 0
  let range = 1
  let lastY = window.scrollY
  const measure = () => {
    top = root.getBoundingClientRect().top + window.scrollY
    range = Math.max(1, root.offsetHeight - stage.offsetHeight) // svh based, immune to URL-bar resizes
    scene.measure()
    tick(lastY)
  }
  const tick = (y: number) => {
    lastY = y
    const p = (y - top) / range
    scene.setLive(p > -0.02 && p < 1)
    scene.update(Math.min(1, Math.max(0, p)))
  }
  const ro = new ResizeObserver(measure)
  ro.observe(root)
  ro.observe(stage)
  document.fonts?.ready.then(measure)
  window.addEventListener('load', measure, { once: true })
  measure()
  const stop = onScroll(({ y }) => tick(y))
  return () => { stop(); ro.disconnect(); scene.setLive(false) }
}

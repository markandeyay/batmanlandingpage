import type Lenis from 'lenis'
import { fineMQ, lowPower, motionOK } from './env'

export interface ScrollState { y: number; dir: 1 | -1 }
type Listener = (s: ScrollState) => void

const listeners = new Set<Listener>()
const state: ScrollState = { y: window.scrollY, dir: 1 }
let lenis: Lenis | null = null
let lenisRaf = 0

const publish = (y: number) => {
  if (y !== state.y) state.dir = y > state.y ? 1 : -1
  state.y = y
  listeners.forEach((fn) => fn(state))
}

/* One passive listener for the page, at most one publish per frame. */
let queued = false
const onNativeScroll = () => {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; publish(window.scrollY) })
}
window.addEventListener('scroll', onNativeScroll, { passive: true })

export const onScroll = (fn: Listener): (() => void) => {
  listeners.add(fn)
  fn(state)
  return () => { listeners.delete(fn) }
}

/* Smooth wheel on desktop only; touch keeps native momentum. Loaded lazily. */
export async function enableSmoothScroll(): Promise<void> {
  if (lenis || !motionOK() || !fineMQ.matches || lowPower()) return
  const { default: LenisCtor } = await import('lenis')
  if (!motionOK() || lenis) return
  lenis = new LenisCtor({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, syncTouch: false })
  window.removeEventListener('scroll', onNativeScroll)
  lenis.on('scroll', (l: Lenis) => publish(l.scroll))
  const loop = (t: number) => { lenis?.raf(t); lenisRaf = requestAnimationFrame(loop) }
  lenisRaf = requestAnimationFrame(loop)
}

export function disableSmoothScroll(): void {
  if (!lenis) return
  cancelAnimationFrame(lenisRaf)
  lenis.destroy()
  lenis = null
  window.addEventListener('scroll', onNativeScroll, { passive: true })
}

export function scrollToTarget(el: HTMLElement, focusEl: HTMLElement = el): void {
  const done = () => focusEl.focus({ preventScroll: true })
  if (lenis) {
    lenis.scrollTo(el, { duration: 1.0, offset: -16, easing: (t) => 1 - (1 - t) ** 4, onComplete: done })
    return
  }
  el.scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto', block: 'start' })
  done()
}

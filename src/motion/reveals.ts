import { motionOK, supportsScrollTimeline } from './env'

const STAGGER_MS = 70
const STAGGER_CAP_MS = 280
let io: IntersectionObserver | null = null

/* Markup: data-reveal (time based), data-reveal="scrub" (CSS scroll driven where
   supported), data-reveal="mark" (one-shot highlighter), data-reveal-group (cascade). */
export function initReveals(root: ParentNode = document): void {
  const all = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
  if (!motionOK() || !('IntersectionObserver' in window)) {
    all.forEach((el) => el.classList.add('is-in'))
    return
  }
  root.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
    group.querySelectorAll<HTMLElement>(':scope > [data-reveal]').forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${Math.min(i * STAGGER_MS, STAGGER_CAP_MS)}ms`)
    })
  })
  const cssOwnsScrub = supportsScrollTimeline()
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      e.target.classList.add('is-in')
      io?.unobserve(e.target)
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 })
  all.filter((el) => !(cssOwnsScrub && el.dataset.reveal === 'scrub')).forEach((el) => io!.observe(el))
}

export function settleAllReveals(): void {
  io?.disconnect()
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'))
}

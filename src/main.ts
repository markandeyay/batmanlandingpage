import './styles/main.css'
import { lowPower, motionOK, onIdle, reduceMQ } from './motion/env'
import { disableSmoothScroll, enableSmoothScroll, onScroll, scrollToTarget } from './motion/scroll'
import { initReveals, settleAllReveals } from './motion/reveals'
import { createChatScene, nativeChatDriver } from './motion/chat'
import { initSignup } from './signup'

const html = document.documentElement

initReveals()
initSignup()

/* T7: quiet header. Hides on the way down, returns on any upward scroll. */
const header = document.querySelector<HTMLElement>('[data-header]')
let headerHidden = false
onScroll(({ y, dir }) => {
  if (!header) return
  const hide = motionOK() && dir === 1 && y > 120
  if (hide !== headerHidden) { headerHidden = hide; header.classList.toggle('is-hidden', hide) }
})

/* In-page links glide, then move focus. Links to sign-up land in the phone field. */
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
  const id = a?.getAttribute('href')
  if (!a || !id || id === '#') return
  const target = document.querySelector<HTMLElement>(id)
  if (!target) return
  e.preventDefault()
  const focusEl = (id === '#get' && document.querySelector<HTMLElement>('#phone')) || target
  if (focusEl === target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
  scrollToTarget(target, focusEl)
  history.replaceState(null, '', id)
})

/* Hero breathing pauses while the hero is off screen. */
const hero = document.querySelector<HTMLElement>('[data-hero]')
if (hero && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => hero.classList.toggle('is-visible', e.isIntersecting)).observe(hero)
}

/* Code-word demos play once in view. */
const demos = document.querySelectorAll<HTMLElement>('[data-demo]')
if (motionOK() && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-demo'); io.unobserve(e.target) }
  }, { threshold: 0.45 })
  demos.forEach((d) => io.observe(d))
} else demos.forEach((d) => d.classList.add('is-demo'))

/* T6: pinned conversation. */
const chatRoot = document.querySelector<HTMLElement>('[data-chat]')
let stopChat: (() => void) | null = null
if (chatRoot && motionOK()) {
  const scene = createChatScene(chatRoot)
  chatRoot.style.setProperty('--steps', String(scene.stepCount))
  html.classList.add('motion-ready') // arms the chat, disarms the reveal failsafe
  stopChat = nativeChatDriver(chatRoot, scene)
} else {
  html.classList.add('motion-ready')
}

/* T1: smooth wheel, lazy and desktop only, after load. */
window.addEventListener('load', () => onIdle(() => {
  if (motionOK() && !lowPower()) void enableSmoothScroll()
}), { once: true })

/* Switch to reduced motion live, without a reload. */
reduceMQ.addEventListener('change', () => {
  if (!reduceMQ.matches) return // richer mode applies on the next visit
  disableSmoothScroll()
  stopChat?.()
  stopChat = null
  settleAllReveals()
  demos.forEach((d) => d.classList.add('is-demo'))
  html.classList.remove('motion', 'motion-ready', 'chat-live')
  header?.classList.remove('is-hidden')
})

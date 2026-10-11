export const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)')
export const fineMQ = matchMedia('(hover: hover) and (pointer: fine)')
export const motionOK = (): boolean => !reduceMQ.matches

type NetNav = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
export const lowPower = (): boolean => {
  const n = navigator as NetNav
  return Boolean(n.connection?.saveData) || (n.deviceMemory ?? 8) <= 2
}

export const supportsScrollTimeline = (): boolean =>
  typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')

export const onIdle = (fn: () => void, timeout = 2000): void => {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout })
  else setTimeout(fn, 300)
}

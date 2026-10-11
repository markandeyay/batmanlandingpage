/* Sign-up form: US number formatting, friendly validation, result swap. */

const digitsOf = (v: string): string => {
  let d = v.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1)
  return d.slice(0, 10)
}

export const formatUS = (d: string): string => {
  if (d.length === 0) return ''
  if (d.length < 4) return `(${d}`
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

const validUS = (d: string): boolean => /^[2-9]\d{2}[2-9]\d{6}$/.test(d)

interface ApiBody { assignedNumber?: string; smsLink?: string; mock?: boolean; error?: string; message?: string }

export function initSignup(): void {
  const form = document.querySelector<HTMLFormElement>('[data-signup]')
  const result = document.querySelector<HTMLElement>('[data-result]')
  if (!form || !result) return
  const phone = form.querySelector<HTMLInputElement>('#phone')!
  const adult = form.querySelector<HTMLInputElement>('#adult')!
  const website = form.querySelector<HTMLInputElement>('#website')!
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!
  const errs = {
    phone: form.querySelector<HTMLElement>('[data-error-for="phone"]')!,
    adult: form.querySelector<HTMLElement>('[data-error-for="adult"]')!,
    form: form.querySelector<HTMLElement>('[data-error-for="form"]')!,
  }
  type Key = keyof typeof errs

  const setError = (key: Key, msg: string) => {
    const el = errs[key]
    el.textContent = msg
    el.hidden = !msg
    const input = key === 'phone' ? phone : key === 'adult' ? adult : null
    if (input) {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false')
      input.closest('.field')?.classList.toggle('is-invalid', Boolean(msg))
    }
  }

  // Format as you type. A backspace over punctuation removes the digit before it.
  let prevDigits = ''
  phone.addEventListener('input', (e) => {
    let d = digitsOf(phone.value)
    if ((e as InputEvent).inputType === 'deleteContentBackward' && d === prevDigits) d = d.slice(0, -1)
    prevDigits = d
    phone.value = formatUS(d)
    if (!errs.phone.hidden && validUS(d)) setError('phone', '')
  })
  adult.addEventListener('change', () => { if (adult.checked) setError('adult', '') })

  const showResult = (num: string, link: string, mock: boolean) => {
    result.querySelector<HTMLElement>('[data-number]')!.textContent = formatUS(digitsOf(num))
    const sms = result.querySelector<HTMLAnchorElement>('[data-sms]')!
    sms.href = link
    result.querySelector<HTMLElement>('[data-mock]')!.hidden = !mock
    form.classList.add('is-gone')
    form.inert = true
    result.hidden = false
    result.focus({ preventScroll: true })
    sms.classList.add('is-ringing')
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (form.classList.contains('is-busy')) return
    setError('form', '')
    const d = digitsOf(phone.value)
    let firstBad: HTMLElement | null = null
    if (!validUS(d)) {
      setError('phone', d.length < 10 ? 'Enter your 10-digit US mobile number.' : 'That number does not look right. Check the area code.')
      firstBad = phone
    } else setError('phone', '')
    if (!adult.checked) {
      setError('adult', 'Please confirm you are 18 or older. Batman is for adults.')
      firstBad ??= adult
    } else setError('adult', '')
    if (firstBad) { firstBad.focus(); return }

    form.classList.add('is-busy')
    submit.disabled = true
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Batman-Signup': '1' },
        body: JSON.stringify({ phone: `+1${d}`, adult: true, website: website.value }),
      })
      const body = (await res.json().catch(() => ({}))) as ApiBody
      if (res.ok && body.assignedNumber && body.smsLink) {
        showResult(body.assignedNumber, body.smsLink, Boolean(body.mock))
        return
      }
      if (body.error === 'phone') { setError('phone', body.message ?? 'Check your number.'); phone.focus(); return }
      if (body.error === 'adult') { setError('adult', body.message ?? 'Please confirm you are 18 or older.'); adult.focus(); return }
      setError('form', body.message ?? 'Something went wrong on our side. Please try again in a minute.')
    } catch {
      setError('form', 'Could not reach Batman. Check your connection and try again.')
    } finally {
      form.classList.remove('is-busy')
      submit.disabled = false
    }
  })
}

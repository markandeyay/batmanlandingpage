# Batman landing page: motion system

Status: proposal v1 (2026-10-10). Owner: front-end motion.
Reference studied: the founder's previous site (stussy.ink), source at
`scratchpad/ref/stussy/site` (Vite 6, GSAP 3.12 + ScrollTrigger, Lenis 1.1, roughjs listed but never imported).
All line ranges below point into that folder. Nothing in it was modified or executed.

Measured on the live site (stussy.ink, production build):

| Asset | Raw | gzip -9 |
|---|---|---|
| `index-*.js` (GSAP + ScrollTrigger + Lenis + app) | 154 KB | 57 KB |
| `index-*.css` | 40 KB | 8.5 KB |
| plus Vercel Insights + Speed Insights scripts | | |

Rough split of that 57 KB: GSAP core about 27 KB, ScrollTrigger about 17 KB, Lenis about 4.5 KB, app code about 8 KB.
That split is the most important number in this document. Almost all of the reference's JS is the
animation library, and the Batman page can get the same feel for a fraction of it.

---

## 0. TL;DR

- Keep the feel: smooth wheel, things that settle into place as you scroll, one pinned "story" moment. Drop the noise:
  loader, curtain, cursor, marquee bands, atmosphere, grain, split-letter jitter.
- Seven techniques: Lenis smooth wheel (desktop only), IntersectionObserver reveals, CSS scroll-driven scrub entrances,
  a CSS-only hero intro with a slow breathing float, gentle CSS parallax, ONE pinned scene (the iMessage conversation,
  which opens with Batman's real onboarding script and is built on `position: sticky`), and a quiet auto-hiding header with a reading-progress hairline.
- Engine decision: **CSS scroll-driven animations first, IntersectionObserver + CSS transitions as the fallback,
  GSAP stays off the critical path.** The pinned chat runs on a native driver of about 1 KB. GSAP + ScrollTrigger are an optional,
  lazy, desktop-only add-on (it scrubs a slight phone tilt), loaded at idle after LCP.
- Budget: phones ship at most 10 KB gzip of JS in total. Desktop gets at most 15 KB without GSAP, with a hard cap of 60 KB when GSAP is on.

---

## 1. Inventory of the reference

How to read the "Fit" column:
- KEEP: use it as is, in spirit.
- ADAPT: keep the idea but change the parameters or the engine.
- DROP: leave it out.

How to read the "Cost" column:
- JS: what it adds to the bundle, or the JS it runs per frame.
- MT: main-thread work while it runs.
- Paint: risk of layout, paint or compositing work.

### 1.1 Scroll engine and motion core

| # | Technique | Where | What it looks like | Cost | Fit |
|---|---|---|---|---|---|
| 1 | Lenis smooth scroll | `src/core/scroll.ts` 54-59 | Wheel input is eased: `duration: 1.05`, expo-out easing `min(1, 1.001 - 2^(-10t))`, `smoothWheel: true`, `touchMultiplier: 1.6`. Gives the "heavy, gliding" page. | About 4.5 KB gz and one rAF loop for the page lifetime. On touch, the 1.6 multiplier changes native fling distance, and phone users notice that as "wrong". | ADAPT: keep it on desktop wheel input only and switch to `lerp: 0.1`, which feels the same and is cheaper to reason about. Never on touch, never under reduced motion. |
| 2 | Lenis to ScrollTrigger sync | `scroll.ts` 61-67 | `lenis.on('scroll', ScrollTrigger.update)`, with Lenis driven from `gsap.ticker` and `lagSmoothing(0)`. | Couples Lenis to GSAP, so GSAP must load before scrolling is smooth. | ADAPT: Lenis owns its rAF until GSAP arrives (if it ever does), then hands over to the ticker. See section 4. |
| 3 | Single scroll broadcast | `scroll.ts` 14-30, 61-64; native fallback 35-52 | One handler, and everything subscribes through `onScroll`. The native path is passive and rAF-coalesced. | Near zero. This is the reference's best idea. | KEEP. |
| 4 | Anchor `scrollTo` | `scroll.ts` 70-78 | A Lenis glide (1.4 s, -8 px offset) or native smooth scrolling. | none | ADAPT: 1.0 s, offset taken from CSS `scroll-margin-top`, instant under reduced motion, then move focus. |
| 5 | Motion tokens | `src/core/motion.ts` 16-24; `src/styles/tokens.css` 90-103 | 4 eases mirrored in CSS and GSAP (`expo.out`, `power4.inOut`, `power2.out`, `back.out(1.7)`) and 5 durations from 160 to 1300 ms. | none | ADAPT: same single-source discipline, calmer values, and no `back.out(1.7)` overshoot, which reads as playful or hype. |
| 6 | ScrollTrigger config | `motion.ts` 40 | `ignoreMobileResize: true`, and refresh only on visibility, DOMContentLoaded and load. This avoids the jump when the mobile address bar resizes. | none | KEEP the lesson. Our sticky-based pin plus `svh` units avoids the problem by construction. |
| 7 | Reduced-motion contract | `motion.ts` 42-51; `src/styles/base.css` 94-103; `src/styles/components.css` 322-332; `src/styles/responsive.css` 69-85 | A `-no-motion` class forces every hidden state to its settled state. Durations drop to 0.001 ms globally, the atmosphere and cursor are hidden, the pinned gallery reflows to a grid, and a preference change reloads the page. | none | KEEP the contract. Improve the change handling by switching live instead of reloading. |
| 8 | Desktop-only choreography in one `matchMedia` scope | `motion.ts` 57-60; `src/scenes.ts` 93-100 | Pins and scrubs run only at 901 px and wider. They are created in document order so pin spacers exist before later triggers measure. | none | KEEP the rule "one scope, document order". We have only one scene, so it is satisfied automatically. |
| 9 | Boot order + refresh on load | `src/main.ts` 23-66 | Prefs, then scroll, then hidden states, then the loader reveal. `ScrollTrigger.refresh()` runs on `load`. | none | KEEP: re-measure the chat scene on `load` and on `document.fonts.ready`. |

### 1.2 Entrances, loader, transitions

| # | Technique | Where | What it looks like | Cost | Fit |
|---|---|---|---|---|---|
| 10 | Loader | `src/fx/loader.ts` 23-81; `index.html` 52-75; `src/styles/chrome.css` 94-155 | Full-screen ink panel with orbiting marks. A 000 to 100 counter is tied to fonts, 2 images and a forced 1.1 s minimum, then a `clip-path` wipes the panel upward over 1.3 s. | Keeps the hero behind an overlay for at least about 2.2 s (1.1 s floor + 0.5 + 0.22 + 0.35 s before the intro starts). The full-viewport `clip-path` transition paints every frame. Hurts LCP and perceived speed directly. | DROP. A safety product must feel instant. |
| 11 | Curtain wipe on nav | `src/fx/curtain.ts` 28-132; `index.html` 79-94; `chrome.css` 157-181; `main.ts` 42-55 | 26 SVG stripes with random widths, eases and delays rise to cover the screen. A gooey `feGaussianBlur` + `feColorMatrix` filter fuses them, the wordmark stamps, the page jumps, and the stripes retract. | 26 `attr:y` tweens (SVG geometry repaints every frame) under a full-viewport SVG filter. The most expensive effect on the site, about 1.1 s per click. | DROP. It hides where the user is going. On a trust page, navigation should be visible and fast. |
| 12 | Hero pre-hide + intro timeline | `src/scenes.ts` 23-31 (hide), 36-51 (timeline) | JS sets elements to `opacity: 0`, then an overlapping timeline plays: the mark rises with a -7 deg rotate and 1.08 scale (1.25 s), eyebrow rules draw (`scaleX`), the mascot springs in (`back.out`), and a badge unwinds from -90 deg. | GSAP must parse before the hero is visible, and hiding the hero with opacity delays LCP until the tween runs. | ADAPT: CSS-only intro with no JS dependency, and the LCP element (H1) never starts at opacity 0. Keep the overlapping beats; drop the spring and the rotation flourish. |
| 13 | Breathing float | `scenes.ts` 54-57 | The mascot bobs `y: -14, rotate: 1.2` on a 3.6 s sine, forever. | One infinite GSAP tween that keeps running off-screen. | ADAPT: a CSS keyframe on the hero phone (6 px, 7 s), paused when the hero is off-screen. A calm "breathing" motion is on-brand. |
| 14 | Split-letter reveal | `src/reveals.ts` 15-54, 81-83; `components.css` 288-304 | Each glyph is wrapped in 2 spans and rides up from 135 % with a 3 deg rotate and 24 ms stagger. It settles to a random +-1 deg tilt and +-0.018 em offset to look "hand set". | Doubles the DOM per character and gives each glyph its own compositor layer while it animates (`will-change: transform` on `.gl`). Screen readers may read split text choppily because the hosts have no `aria-label`. | DROP. Random tilt reads as streetwear; a safety headline should be perfectly level. |
| 15 | Split-word reveal | `reveals.ts` 56-72, 84-86; `components.css` 306-313 | Words rise from 105 % inside clipping wrappers with a 34 ms stagger, capped at 520 ms. | Same DOM inflation, smaller. | DROP for v1, since a whole-element rise is enough. |
| 16 | Enter-on-view reveal with sibling cascade | `reveals.ts` 88-119; `components.css` 281-286 | IO adds `-in`, and CSS transitions `opacity` + `translate3d(0, 40px)` over 900 ms expo-out. Siblings cascade 80 ms apart, capped at 400 ms, and `-settled` releases `will-change`. | No JS runs during the animation (compositor only). | KEEP, with 16 px travel, 640 ms, and a 70 ms stagger capped at 280 ms. |
| 17 | Section rule draw | `components.css` 44-62, 87-89 | The hairline under each section head grows `scaleX(0 to 1)` over 1.3 s, starting from the index number. | Transform only. | ADAPT: it becomes the scroll-linked connector line between the 3 "how it works" steps. |

### 1.3 Scroll-scrubbed scenes

| # | Technique | Where | What it looks like | Cost | Fit |
|---|---|---|---|---|---|
| 18 | Hero parallax | `scenes.ts` 63-75 | The lockup drifts `yPercent: -14` and the mascot `+16`, and the eyebrow fades up and out, all with `scrub: true` across the hero. | 3 ScrollTriggers, transform and opacity only. | ADAPT: a CSS `view()` timeline, the phone drifts at most 40 px, and text does not fade. |
| 19 | Story scrub timeline | `scenes.ts` 104-160; `src/styles/sections.css` 85-110 | Manifesto lines rise out of masks and a highlighter stripe grows behind one line (`backgroundSize 0 to 100%`). Body copy slides in from +-46 px, a photo un-clips (`clipPath inset`) while un-rotating, a badge stamps in, and facts slide in. `scrub: 0.9`, range `top 82%` to `bottom 68%`. | Mostly transform and opacity, but `backgroundSize` and `clipPath` are tweened under scrub, which repaints every frame. The comment at 153-154 holds a real lesson: the last item must land well before the trigger ends. | ADAPT: the "settles as you scroll" feel moves to CSS scroll-driven entrances (T3). The highlighter survives as a one-shot `scaleX` pseudo-element on the trust section's key phrase. |
| 20 | Ghost word drift | `scenes.ts` 77-83; `sections.css` 86-93 | A huge outlined italic word slides sideways (`xPercent 8 to -20`, `scrub: 1.1`). | A large layer kept promoted permanently (`will-change`). | DROP. |
| 21 | Rotating mark | `scenes.ts` 85-91 | A sticker rotates from -32 to 32 deg as you scroll past. | cheap | DROP (playful). |
| 22 | Pinned horizontal gallery | `scenes.ts` 163-241; `sections.css` 142-185; `responsive.css` 38-43, 74-85 | The page's single pin: vertical scroll drives a horizontal track (`scrub: 0.8`, `anticipatePin: 1`, `invalidateOnRefresh`), and each photo drifts on its own `scrub: 1.2`. The "01/06" counter and progress bar update in `onUpdate`, guarded so `textContent` is written only when the index changes. The shots first "deal" in from a rotated stack (`once: true`). Desktop only; reduced motion reflows the gallery to a grid. | A GSAP pin spacer (re-parents the section and inserts padding) plus 7 scrubbed tweens. The guarded write (194-215) and the `immediateRender: false` note (219-223) are excellent practice. | ADAPT: this is the template for the chat scene. Keep exactly one pin, the guarded HUD writes and the reduced-motion reflow. Replace the GSAP pin with CSS `position: sticky` and make it work on phones too. |
| 23 | Product cards + stamps | `scenes.ts` 244-265 | Cards rise 110 px with a +-4 deg tilt, then "SOLD" stamps slam in from 2.2x scale and -34 deg (`back.out`), `scrub: 0.9`. | transform only | DROP the stamp. The card rise becomes the generic scrub entrance. |
| 24 | Card deal / alternating slide | `scenes.ts` 268-291 | Cards deal up with a fan of rotations, and columns slide in from alternating sides (+-80 px), `scrub: 0.9`. | transform only | ADAPT: the three step cards rise 32 px with no rotation, on a CSS view timeline. |

### 1.4 Ambient layers and chrome

| # | Technique | Where | What it looks like | Cost | Fit |
|---|---|---|---|---|---|
| 25 | Atmosphere | `src/fx/atmosphere.ts` 88-240; `chrome.css` 6-82; `index.html` 96-97 | Three fixed, full-viewport depth layers behind the page: 10-16 lanes of streaming text (90-210 s keyframes), 7-13 "breathing" print marks, and a big mark crossing the screen every 5-10 s. Scroll velocity skews each layer sideways via `quickTo`, then it settles. | Hundreds of DOM nodes and 18 extra images. A permanent `will-change` layer for every plane, lane and mark, which is memory-heavy on phones. A `quickTo` + `delayedCall` on every scroll event. | DROP. It is the visual opposite of "calm". |
| 26 | Grain overlay | `chrome.css` 84-92 | Static SVG turbulence noise fixed over the whole page, `mix-blend-mode: multiply`. | Static, but a fixed full-viewport blended layer is recomposited on every scroll frame. | DROP. Light, clean theme. |
| 27 | Section deco marks | `src/fx/deco.ts` 46-95; `components.css` 15-37 | 5 large, faint marks per solid-colour section, each parallaxing at its own rate (`scrub: 1.15`). | 15 scrubbed tweens and 15 permanent layers. | ADAPT (very lightly): one soft CSS gradient shape behind the hero phone, with parallax on a CSS view timeline. |
| 28 | Marquee bands | `src/fx/bands.ts` 20-106; `components.css` 100-130; `index.html` 176-195 | Tilted tape between sections loops forever at 74 px/s. Rows pause off-screen (IO), scroll velocity speeds them up via `timeScale`, and fast scrolling flips them to an "urgent" colour. | Infinite tweens plus a quickTo per scroll event. The IO pause and the guarded class flip are good practice. | DROP. Moving text you have to read is an accessibility problem (WCAG 2.2.2), and the effect is hype language. Trust facts appear as a static chip row instead. |
| 29 | Lagging cursor | `src/fx/cursor.ts` 12-72; `chrome.css` 258-290 | A ring follows the pointer (`LERP 0.19`), grows to 76 px with a label over links, and inverts on dark sections. | rAF while the pointer moves. The ring transitions `width/height/margin` (layout properties) on hover, which is a layout-thrash bug. | DROP. A custom cursor makes controls less obvious, and this page needs native, predictable controls. |
| 30 | Header auto-hide | `src/fx/chrome.ts` 24-31; `chrome.css` 183-191 | Hides (`translateY(-115%)`, 560 ms) when you scroll down past 180 px and returns when you scroll up. `mix-blend-mode: difference` keeps it legible on any section. | The guarded toggle is cheap. The blend mode on a fixed header forces blending of everything that passes under it, every frame. | ADAPT: keep the hide and show, but use a solid 94 % white background with a hairline instead of a blend mode or `backdrop-filter`. |
| 31 | Chapter rail + progress | `chrome.ts` 39, 46-68; `chrome.css` 231-256 | A fixed left spine whose `scaleY` fill shows page progress. An IO with a -45 % root-margin band swaps in the current section name. | A style write every scroll frame (the text write is guarded). | ADAPT: a 2 px hairline under the header, driven by a CSS `scroll()` timeline with no JS. |
| 32 | Page-top button | `chrome.ts` 32-38; `chrome.css` 292-303 | A round button fades and scales in after 1.1 viewports. | cheap | DROP for v1. |
| 33 | Media "fan" hover | `src/fx/media.ts` 20-72; `components.css` 150-193 | On hover, two ghost copies of each photo fan out with rotation. A coloured offset plate (`box-shadow`) collapses. | 2 cloned images per photo, and the `box-shadow` transition paints every frame. | DROP. There is no photography on this page. |
| 34 | Ellipse veil hover | `sections.css` 249-273 | A navy `clip-path: ellipse()` blooms from a per-card origin on hover. | The `clip-path` transition paints every frame. | DROP. Hover-only effects do nothing on phones. |
| 35 | Sheen through wordmark | `components.css` 221-254 | A colour band slides through the masked logo forever (a transformed child, a good optimisation). | One infinite compositor animation. | DROP. |
| 36 | Rotary badge | `components.css` 256-266 | A text ring rotates 360 deg every 18 s. | An infinite animation. | DROP. |
| 37 | Scroll cue | `sections.css` 63-71 | A 1 px tick pulses `scaleY` from 0.3 to 1 forever. | Infinite, tiny. | ADAPT (optional): 3 cycles, then stop. |
| 38 | Underline sweep | `chrome.css` 220-229 | A link underline grows from the right and leaves to the left (`scaleX`, 320 ms). | transform only | KEEP for text links. |
| 39 | roughjs | `package.json` | Listed as a dependency but never imported in `src/`. | none at runtime | DROP. |

### 1.5 Habits to inherit as rules

1. One scroll listener for the whole page (`scroll.ts` 21-30).
2. Every class or text write in a scroll path is guarded by a state check (`chrome.ts` 6-10, `bands.ts` 82-92, `scenes.ts` 192-215).
3. Hidden-by-default states are applied by script, so a JS failure leaves a readable page (`scenes.ts` 21-22).
4. Anything scrubbed animates transform and opacity only (`scenes.ts` 8-10). The reference broke this itself in #19.
5. Exactly one pinned scene per page (`scenes.ts` 11-15).
6. Infinite loops pause when off-screen (`bands.ts` 58-69).
7. `will-change` is released after one-shot animations (`reveals.ts` 96-102).

---

## 2. Recommended motion system for Batman

### 2.1 Principles

- **Calm over clever.** Nothing overshoots more than 3 % and nothing rotates more than 3 deg. The only loops are the hero phone's breathing and the typing dots.
- **Honesty never waits.** Safety-critical copy (not 911, limitations, consent) is never hidden behind a scroll position.
- **The scroll tells one story.** There is exactly one pinned scene: the conversation, which opens with Batman's real onboarding.
- **Phones are the primary device.** Touch scrolling stays native, and the pinned scene works on a 360 px screen.
- **Progressive.** Users with JS off or reduced motion on see the complete page in its final state, with the chat as a readable transcript.

### 2.2 Tokens (CSS custom properties are the single source of truth)

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | most motion |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | header slide, crossfades |
| `--ease-bubble` | `cubic-bezier(0.3, 1.2, 0.5, 1)` (about 3 % overshoot) | chat bubbles only, a soft iMessage-like spring |
| `--d-1` | 140 ms | hover, press, typing-to-bubble handoff |
| `--d-2` | 240 ms | UI state, read receipt fade |
| `--d-3` | 380 ms | chat bubbles |
| `--d-4` | 640 ms | reveals |
| `--d-5` | 900 ms | hero intro beats |
| `--rise` | 16 px (12 px under 700 px) | reveal travel |
| stagger | 70 ms per sibling, capped at 280 ms | reveal groups |

### 2.3 The seven techniques

| # | Technique | Source | Engine | Parameters |
|---|---|---|---|---|
| T1 | Smooth wheel | #1, #2 | Lenis, lazy-loaded, desktop with a fine pointer only | `lerp: 0.1`, `wheelMultiplier: 1`, `smoothWheel: true`, `syncTouch: false`. Anchor glides use `duration: 1.0` and the easing `t => 1 - (1 - t) ** 4`. Off under reduced motion, Save-Data, or `deviceMemory <= 2`. |
| T2 | Reveal on enter | #16 | IntersectionObserver + CSS transitions | `opacity 0 to 1`, `translate 0 16px to 0`, 640 ms `--ease-out`. 70 ms stagger (cap 280 ms) inside `[data-reveal-group]`. IO `rootMargin: 0px 0px -10% 0px`, unobserve after the first hit. A CSS failsafe shows everything 2.5 s after first paint if the module never boots. |
| T3 | Scrub entrance | #19, #23, #24 | CSS `animation-timeline: view()`, falling back to T2 | `opacity 0 to 1`, `translate 0 32px to 0`, `animation-range: entry 5% cover 30%`. Only for the 3 step cards and the 2 code-word cards, never for trust copy. |
| T4 | Hero intro + breathing | #12, #13 | CSS keyframes, no JS | Beats at 0 / 90 / 180 / 300 ms. The H1 lifts 10 px with transform only, so LCP is safe. The subhead and CTA fade and rise 14 px. The phone rises 24 px from `scale(0.98)` over 900 ms, then breathes: `translate 0 -6px`, 7 s alternate, paused while the hero is off-screen. |
| T5 | Gentle parallax | #18, #27 | CSS `view()` timeline, no fallback | The hero phone wrapper moves `translate 0 0 to 0 -40px` across the hero's exit. The breathing lives on an inner element, so the two transforms never fight. |
| T6 | Pinned chat scene | #22 | CSS `position: sticky` + a native progress driver of about 1 KB. Optional lazy ScrollTrigger on desktop. | See 2.5 for the full spec. Bubbles change state as discrete class flips with time-based transitions, so they are never left half-scrubbed. Optional desktop GSAP tilt: the phone goes `rotate -2.5 to 0`, `yPercent 6 to 0`, `scale 0.97 to 1` with `scrub: 0.6`, from `top 85%` to `top top`. |
| T7 | Quiet header + progress hairline | #30, #31, #38 | Scroll bus (guarded toggle) + CSS `scroll()` timeline | The header hides when you scroll down past 120 px and shows on any upward scroll: `translateY(-100%)`, 240 ms. It also hides while the chat scene is live. A 2 px hairline shows `scaleX` on `scroll(root)`. |

Not used anywhere: loader, curtain, custom cursor, marquee bands, atmosphere, grain, split letters, sheen, rotating badges, hover-only image effects.

### 2.4 Scroll narrative

| Section | Height (desktop / phone) | Motion | Notes |
|---|---|---|---|
| **Hero**: pitch, "Get your Batman" CTA, phone mockup | `min(100svh, 860px)` / `100svh` | T4, T5, and the T7 hairline starts | The mockup is HTML/CSS, so the LCP element is the H1 text. It shows one calm bubble from Batman. The CTA glides (T1) to sign-up, then focuses the phone input. |
| **How it works**: plan, quiet watch, escalate | about 120vh / auto | T3 on the 3 cards (T2 where unsupported). A connector line draws `scaleX` (`scaleY` on phones) on `view()`, `entry 20% cover 55%` | Static SVG icons. |
| **Conversation** (the pinned scene) | `100svh + steps x 28vh` / `100svh + steps x 24svh` (11 steps: about 408vh / 364svh) | T6. Chapter A is the onboarding intro (section 2.5, founder's exact script). Chapter B is a short example night out. The caption column steps through: "Meet Batman", "Add someone you trust", "Text your plan", "A quiet check-in", "Say your exit word". The header hides while the scene is live. | The transcript is a real `<ol>`, so screen readers read it in order. A skip link appears on focus. With reduced motion or no JS, the section has a normal height and shows the full transcript statically. |
| **Code words**: exit word = fake call, alert word = silent alert | about 100vh / auto | T3 on two cards. Each card's mini phone plays a one-shot demo once it enters view. Exit word: an "Incoming call" sheet slides up (`translateY(100%) to 0`, 500 ms). Alert word: a "Silent alert sent" toast fades in (240 ms). A "Replay" button replays the demo. | Reduced motion shows the end state. |
| **Trust and honesty**: consent, location only during the plan window, deleted after 24 h, not 911, limitations | auto | T2 only. "Deleted after 24 h" gets a one-shot highlighter (`::after` `scaleX`, 700 ms). The "Batman is not 911" callout has no reveal at all. | The calmest section: no scrub, no parallax. |
| **Sign-up**: phone number + 18+ checkbox, then the personal Batman number and a tap-to-text button | about 90vh / auto | T2 on the card. The submit label crossfades to a spinner. The form and the result share one grid cell and crossfade over 240 ms, so the height is reserved (zero CLS). The number appears instantly as plain selectable text, with no scramble effect. The `sms:` button gets one 600 ms soft ring. | Errors fade in inline over 140 ms, never a shake. Focus moves to the result. |
| **Footer**: HackNC 2026, Photon track, GitHub link | auto | Underline sweep on links only | |

### 2.5 Intro conversation spec (founder's exact copy, opens the pinned scene)

**Script (updated version: the bot greets by name).** Steps run in scroll order. "Kind" drives the styling and the typing logic.

| Step | Kind | Who / side | Content |
|---|---|---|---|
| 1 | `me` | User, blue, right | "Hi, I'm Robin" |
| (typing) | `typing` | Batman, left | three dots, shown before step 2 |
| 2 | `bat` | Batman, gray, left | "Hey Robin, I'm Batman. Text me before you meet someone new (a date, a Marketplace pickup, an apartment viewing) and I'll quietly look out for you." |
| (typing) | `typing` | Batman | shown before step 3 |
| 3 | `bat` | Batman, gray, left | "Quick setup, takes a minute. Who should I contact if you might need help? Send me their name and number, or share their contact card." |
| 4 | `receipt` | under bubble 1, right-aligned | "Read" |
| 5 (optional) | `me` | User, blue, right | "My roommate Alfred, I'll send his card" |
| 6 (optional) | `card` | User, right | Contact card bubble: avatar initial "A", name "Alfred" |

Chapter B follows the intro (steps 7-11, **placeholder copy, product to finalise**): the user texts a plan, Batman confirms the check-in time and the code words, Batman checks in quietly, the user sends the exit word, and Batman replies "Calling you now."

Dropping the optional steps 5-6 shortens the section by 2 slots.

**Per-step reveal timing.** Scroll position decides *when* a step happens. Each step then plays out on a fixed clock, so nothing is ever left half-drawn.

- Step slots: progress `p` from 0 to 1 over the section. `LEAD = 0.06`: nothing happens in the first 6 % while the phone settles in. `SPAN = 0.80`: every step has landed by 86 %, which leaves a calm hold on the finished thread.
- **Outgoing bubble (`me`, `card`)**: appears at the start of its slot. `opacity 0 to 1` over 380 ms `--ease-out`. `translate 0 10px to 0` and `scale 0.96 to 1` over 380 ms `--ease-bubble`, with `transform-origin` at the bottom right.
- **Incoming bubble (`bat`)**: the typing indicator shows from 40 % of the *previous* slot onward (`TYPING_AT = 0.4`), so it is visible for about 60 % of a slot (roughly 17vh of scroll, or about 1 s at a normal reading pace). When the bat slot starts, the dots fade out over 140 ms. The bubble appears 60 ms later at the same spot with the outgoing timings, mirrored (`transform-origin` at the bottom left).
- **Typing indicator**: a gray bubble 44 x 30 px holding three 7 px dots. Each dot loops over 1.2 s: `opacity 0.35 to 1 to 0.35` and `translate 0 0 to 0 -2px to 0`, `ease-in-out`, staggered 0 / 0.16 / 0.32 s. The bubble fades in over 240 ms linear. The dot loop runs only while the indicator is visible (`animation-play-state`).
- **Read receipt**: a text-only line, 11 px, secondary gray, right-aligned under bubble 1. `opacity 0 to 1` over 240 ms linear with a 120 ms delay and no movement. Its line height is **reserved in the layout from the start** (it sits at opacity 0), so bubbles 2 and 3 never move when it appears.
- **Thread follow**: once the newest step would fall below the phone screen, the thread list moves up by `transform` over 420 ms `--ease-out`. Geometry is measured once per resize or font load, never per frame.
- **Scrolling back up** reverses the steps with the same transitions. The receipt and bubbles fade back out, and the typing dots reappear only where their slot rules say so.

**Building it: HTML bubbles (recommended) or the designer's SVG.**

- **Recommended: HTML/CSS bubbles that match `images/mockup-intro.svg`.** The designer's SVG becomes the visual spec. Lift the colours (blue `#0B84FE`-like outgoing, light gray incoming), radius, tail shape, padding, 17 px type and spacing into CSS tokens. Benefits: real text (accessible, selectable, translatable, crisp at any DPR), a few hundred bytes, and the same DOM serves as the reduced-motion transcript.
- **Alternative: reuse the SVG directly.** It must be **inlined** in the HTML. As an `<img>` its parts cannot be animated. Ask the designer to export it with:
  - one `<g>` per step with ids and data attributes: `<g id="chat-step-1" data-step="1" data-kind="me">`, `data-kind="typing"` for the dots group, `data-kind="receipt"` for "Read", and so on;
  - the scrolling messages wrapped in `<g id="chat-thread">` inside a `clipPath` for the screen;
  - text kept as live `<text>`, not outlined to paths, plus a `<title>` per group or an `aria-label` on the root;
  - no filters or embedded raster images; the file optimised with SVGO, ideally under 15 KB.

  The same `chat.ts` then drives the groups, because it only toggles classes and sets a transform on the thread. CSS needs `transform-box: fill-box` so that `scale` and `transform-origin` resolve per bubble.
- `images/mockup-intro.png` is for OG/social previews and docs only. It is never loaded by the page.

**Reduced-motion and no-JS fallback.** The section has its natural height and no sticky stage. Every bubble, the contact card and the "Read" receipt are visible statically in final order, and the typing indicator is hidden (`display: none`). Users with JS off or reduced motion on see exactly the designer's static mockup, built from the same DOM.

---

## 3. Performance budget and techniques

### 3.1 Targets (Lighthouse mobile, simulated slow 4G)

| Metric | Target |
|---|---|
| Lighthouse Performance / Accessibility / Best Practices / SEO | >= 95 / 100 / 100 / 100 |
| LCP | <= 1.8 s (H1 text) |
| CLS | <= 0.02 |
| TBT | <= 100 ms |
| INP (p75) | <= 150 ms |
| Scroll | 60 fps through the pinned scene on a mid-tier phone (DevTools, 4x CPU slowdown) |

### 3.2 Byte budget (gzip)

| Bucket | Budget | Expected |
|---|---|---|
| HTML incl. inlined critical CSS | <= 14 KB (first round trip) | about 9 KB |
| CSS total | <= 10 KB | about 7 KB |
| JS, initial module (scroll bus, reveals, chat scene + native driver, header, sign-up form) | <= 8 KB | about 4-5 KB |
| JS, Lenis (lazy, desktop with a fine pointer only) | <= 5 KB | about 4.5 KB |
| JS, GSAP + ScrollTrigger (optional, lazy, desktop only) | <= 46 KB | about 44 KB |
| **JS total, phones** | **<= 10 KB** | about 5 KB |
| **JS total, desktop** | **<= 15 KB without GSAP; 60 KB hard cap with it** | about 9 KB / about 53 KB |
| Fonts | <= 80 KB, at most 2 files on the critical path | about 60 KB |
| Images above the fold | 0 KB (the mockup is HTML/CSS) | 0 |

For comparison, the reference ships 57 KB gzip of JS to every device before anything moves.
**Recommendation: ship v1 without GSAP** (`ENHANCE_WITH_GSAP = false`). Turn it on only if the founder wants the scrubbed phone tilt.

### 3.3 Engine decision: CSS scroll-driven first, IO fallback, GSAP optional

- **Scrubbed decoration (T3, T5, the connector line, the progress hairline):** CSS `animation-timeline: view() / scroll()`, inside `@supports` and `prefers-reduced-motion: no-preference`. It runs off the main thread in Chromium and Safari 26+. It also follows Lenis automatically, because Lenis moves the real scroll position. Where it is unsupported (Firefox at the time of writing; verify on caniuse), T3 falls back to T2 and T5 simply does not run. No polyfill and no GSAP fallback: decoration is not worth 44 KB.
- **The narrative scene (T6)** must work the same everywhere and has discrete states. It runs on a native driver with cached geometry, so there are no layout reads per frame. The pin is `position: sticky`: no pin spacer, no re-parenting, no jump when the mobile URL bar resizes.
- **GSAP + ScrollTrigger** are a lazy add-on only. `import()` runs in `requestIdleCallback` after `load`, and only when motion is allowed, the pointer is fine, the viewport is 900 px or wider, and Save-Data is off. GSAP then swaps out the native chat driver: it is the same scene object with a different progress source. Nothing may import `gsap` statically. Set `build.modulePreload.polyfill = false`.

### 3.4 Transform and opacity only

- Animate only `transform`, the individual `translate` / `scale` / `rotate` properties, and `opacity`. Never animate `width`, `height`, `margin`, `top`, `clip-path`, `background-size`, `box-shadow` or `filter`. The reference broke this in #19, #29, #33 and #34.
- To make a shadow appear, pre-render it on a pseudo-element and fade that element's `opacity`.
- No `backdrop-filter` or `mix-blend-mode` on fixed or sticky elements.
- The sticky stage gets `contain: layout paint` and `overflow: clip`. Never put `overflow: hidden` on an ancestor of a sticky element: it breaks stickiness.

### 3.5 `will-change` discipline

- Never set it in static CSS for one-shot transitions; the browser promotes those automatically while they run.
- It is allowed in two places, and only while active:
  - `.chat.is-live [data-chat-thread]`;
  - the hero phone during its intro, removed on `animationend`.
- At most 4 promoted layers at once on phones. Infinite animations (breathing, typing dots) pause when they are hidden or off-screen.

### 3.6 Images

- The phones are HTML/CSS (or the inlined SVG described in 2.5): 0 bytes of raster.
- Any raster image uses `<picture>` with AVIF, then WebP, then JPEG/PNG. Set `width`/`height` and `sizes`. Below the fold, use `loading="lazy" decoding="async"`. Use `fetchpriority="high"` only on an above-the-fold raster. Aim for 60 KB or less per image at 2x.
- Soft background shapes are CSS gradients. Never animate `filter: blur()`.

### 3.7 Fonts: 2 self-hosted Google Fonts

- The brand doc picks two families. An example pairing that fits "friendly, trustworthy": a soft display face (such as Fraunces, one weight) and Inter variable for text. Self-host them and never use fonts.googleapis.com, which adds extra round trips and leaks visitor data on a privacy product.
- `woff2` only, Latin subset via `unicode-range`, one static display weight and one variable text file.
- `font-display: swap` on both. Preload only the display weight used by the H1 (the LCP element):
  `<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/display-600.woff2">`.
- Add metric-matched fallback faces so the font swap causes no layout shift: `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`, with values generated by Capsize or fontaine.
- Re-measure the chat scene after `document.fonts.ready`, because line wraps change bubble heights.

### 3.8 No layout shift

- A 1-line inline `<head>` script adds `.motion` before first paint, so the first layout is the final one. The chat section's height lives in CSS.
- The pin is sticky, with no JS spacer.
- The "Read" receipt line is reserved at opacity 0. The sign-up form and result share one grid cell. The phone mockups use `aspect-ratio: 9 / 19.5`.
- Nothing is injected above content after load. Reveals use `translate`, which never causes CLS.

### 3.9 Reduced motion and low power

| Feature | `prefers-reduced-motion: reduce` | No JS | Save-Data / low memory |
|---|---|---|---|
| Lenis | off (native scroll) | off | off |
| Reveals T2 / T3 | visible at once | visible (the CSS failsafe reveals them at 2.5 s) | kept |
| Hero intro / breathing | static | CSS intro runs, breathing paused | intro kept, breathing off |
| Parallax T5 | off | decorative CSS only | off |
| Chat T6 | normal-height section; all bubbles, the contact card and "Read" visible; typing dots hidden | same (the chat arms only once `.motion-ready` is set, and the module sets it) | native driver kept |
| Code-word demos | end state, Replay jumps to the end state | end state | kept |
| Header | always visible | visible | kept |
| Anchor jumps | instant, then focus moves | native | instant |
| GSAP | never loaded | n/a | never loaded |

When the preference changes mid-session, the page applies it live (it destroys Lenis, stops the drivers and removes `.motion`) without reloading.

---

## 4. Code skeleton (TypeScript, original, framework-free)

```
src/
  main.ts
  motion/
    env.ts        prefs, idle helper
    scroll.ts     scroll bus, lazy Lenis, ScrollTrigger hand-over
    reveals.ts    data-attribute reveals
    chat.ts       pinned conversation scene + drivers
  styles/motion.css
```

### 4.1 `index.html` head

```html
<link rel="preload" href="/fonts/display-600.woff2" as="font" type="font/woff2" crossorigin>
<script>
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion');
</script>
<script type="module" src="/src/main.ts"></script>
```

### 4.2 `motion/env.ts`

```ts
export const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)')
export const fineMQ = matchMedia('(hover: hover) and (pointer: fine)')
export const motionOK = () => !reduceMQ.matches

type NetNav = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
export const lowPower = () => {
  const n = navigator as NetNav
  return Boolean(n.connection?.saveData) || (n.deviceMemory ?? 8) <= 2
}

export const supportsScrollTimeline = () =>
  typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')

export const onIdle = (fn: () => void, timeout = 2000) => {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout })
  else setTimeout(fn, 300)
}
```

### 4.3 `motion/scroll.ts`

```ts
import type Lenis from 'lenis'
import type { gsap as Gsap } from 'gsap'
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger'
import { fineMQ, lowPower, motionOK } from './env'

export interface ScrollState { y: number; velocity: number; dir: 1 | -1 }
type Listener = (s: ScrollState) => void

const listeners = new Set<Listener>()
const state: ScrollState = { y: window.scrollY, velocity: 0, dir: 1 }
let lenis: Lenis | null = null
let lenisRaf = 0

const publish = (y: number, velocity: number) => {
  state.dir = y >= state.y ? 1 : -1
  state.y = y
  state.velocity = velocity
  listeners.forEach((fn) => fn(state))
}

/* Native path: one passive listener, at most one publish per frame. */
let queued = false
const onNativeScroll = () => {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; publish(window.scrollY, 0) })
}
window.addEventListener('scroll', onNativeScroll, { passive: true })

export const onScroll = (fn: Listener) => {
  listeners.add(fn)
  fn(state)
  return () => listeners.delete(fn)
}

/* Smooth wheel on desktop only; touch keeps native momentum. */
export async function enableSmoothScroll(): Promise<void> {
  if (lenis || !motionOK() || !fineMQ.matches || lowPower()) return
  const { default: LenisCtor } = await import('lenis')
  if (!motionOK()) return
  lenis = new LenisCtor({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, syncTouch: false })
  window.removeEventListener('scroll', onNativeScroll)
  lenis.on('scroll', (l: Lenis) => publish(l.scroll, l.velocity))
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

/* Only if the lazy GSAP chunk loads: Lenis moves onto the GSAP ticker so
   ScrollTrigger and Lenis read the same frame. */
export function attachScrollTrigger(gsap: typeof Gsap, ScrollTrigger: typeof ST): void {
  ScrollTrigger.config({ ignoreMobileResize: true })
  if (!lenis) return
  cancelAnimationFrame(lenisRaf)
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

export function scrollToTarget(el: HTMLElement): void {
  const done = () => el.focus({ preventScroll: true })
  if (lenis) {
    lenis.scrollTo(el, { duration: 1.0, easing: (t) => 1 - (1 - t) ** 4, onComplete: done })
    return
  }
  el.scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto', block: 'start' })
  done()
}
```

### 4.4 `motion/reveals.ts`

Markup contract: `data-reveal` (time-based), `data-reveal="scrub"` (CSS scroll-driven where supported), `data-reveal="mark"` (one-shot highlighter), `data-reveal-group` (cascade parent).

```ts
import { motionOK, supportsScrollTimeline } from './env'

const STAGGER_MS = 70
const STAGGER_CAP_MS = 280
let io: IntersectionObserver | null = null

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

  all
    .filter((el) => !(cssOwnsScrub && el.dataset.reveal === 'scrub'))
    .forEach((el) => io!.observe(el))
}

export function settleAllReveals(): void {
  io?.disconnect()
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'))
}
```

### 4.5 `motion/chat.ts`

Markup contract (HTML build; the inlined-SVG build uses the same `data-step` / `data-kind` attributes on `<g>` groups):

```html
<section id="conversation" class="chat" data-chat style="--steps: 11" aria-labelledby="chat-title">
  <a class="skip" href="#code-words">Skip the example conversation</a>
  <div class="chat__stage">
    <ol class="chat__captions">
      <li data-cap="1">Meet Batman</li>
      <li data-cap="3">Add someone you trust</li>
      <li data-cap="7">Text your plan</li>
      <li data-cap="9">A quiet check-in</li>
      <li data-cap="10">Say your exit word</li>
    </ol>
    <div class="phone" data-chat-phone>
      <div class="phone__screen" data-chat-screen>
        <ol class="thread" data-chat-thread aria-label="Example conversation with Batman">
          <li class="msg msg--me" data-step="1" data-kind="me">Hi, I'm Robin</li>
          <li class="receipt" data-step="4" data-kind="receipt">Read</li>
          <li class="msg msg--bat" data-step="2" data-kind="bat">Hey Robin, I'm Batman. Text me before you meet someone new (a date, a Marketplace pickup, an apartment viewing) and I'll quietly look out for you.</li>
          <li class="msg msg--bat" data-step="3" data-kind="bat">Quick setup, takes a minute. Who should I contact if you might need help? Send me their name and number, or share their contact card.</li>
          <li class="msg msg--me" data-step="5" data-kind="me">My roommate Alfred, I'll send his card</li>
          <li class="msg msg--card" data-step="6" data-kind="card"><span class="avatar" aria-hidden="true">A</span> Alfred</li>
          <!-- steps 7-11: chapter B, placeholder copy -->
        </ol>
        <div class="typing" data-chat-typing aria-hidden="true"><i></i><i></i><i></i></div>
      </div>
    </div>
  </div>
</section>
```

DOM order is the visual order: the receipt sits under bubble 1. `data-step` is the reveal order.

```ts
import { onScroll } from './scroll'

const LEAD = 0.06       // the phone settles in first
const SPAN = 0.8        // every step has landed by 86 %, then a calm hold
const TYPING_AT = 0.4   // typing dots from 40 % of the slot before a Batman bubble
const FOLLOW_PAD = 16   // px of room under the newest item

type Kind = 'me' | 'bat' | 'card' | 'receipt'

export interface ChatScene {
  update: (progress: number) => void
  measure: () => void
  setLive: (live: boolean) => void
}

export function createChatScene(root: HTMLElement): ChatScene {
  const screen = root.querySelector<HTMLElement>('[data-chat-screen]')!
  const thread = root.querySelector<HTMLElement>('[data-chat-thread]')!
  const typing = root.querySelector<HTMLElement>('[data-chat-typing]')
  const steps = Array.from(thread.querySelectorAll<HTMLElement>('[data-step]'))
    .sort((a, b) => Number(a.dataset.step) - Number(b.dataset.step))
  const kinds = steps.map((el) => el.dataset.kind as Kind)
  const caps = Array.from(root.querySelectorAll<HTMLElement>('[data-cap]'))
  const n = steps.length

  let shown = -1
  let typingOn = false
  let activeCap = -1
  let live = false
  let viewH = 0
  let reach: number[] = [] // reach[i] = lowest visible edge once steps 0..i are shown

  /* Geometry is read once per resize or font load, never per frame. */
  const measure = () => {
    viewH = screen.clientHeight
    let max = 0
    reach = steps.map((el) => (max = Math.max(max, el.offsetTop + el.offsetHeight)))
    follow(shown)
  }

  const follow = (i: number) => {
    const bottom = i >= 0 ? reach[i] : 0
    const offset = Math.max(0, bottom - viewH + FOLLOW_PAD)
    thread.style.transform = `translate3d(0, ${-offset}px, 0)`
    if (typing) typing.style.transform = `translate3d(0, ${bottom - offset}px, 0)`
  }

  const show = (i: number) => {
    if (i === shown) return
    // touch only the steps whose state changes (guarded writes)
    for (let k = Math.max(0, Math.min(i, shown) + 1); k <= Math.max(i, shown); k++) {
      steps[k].classList.toggle('is-shown', k <= i)
    }
    shown = i
    follow(i)

    const stepNo = i >= 0 ? Number(steps[i].dataset.step) : 0
    let cap = -1
    caps.forEach((c, idx) => { if (Number(c.dataset.cap) <= Math.max(stepNo, 1)) cap = idx })
    if (cap !== activeCap) {
      caps[activeCap]?.classList.remove('is-active')
      caps[cap]?.classList.add('is-active')
      activeCap = cap
    }
  }

  const update = (p: number) => {
    const raw = ((p - LEAD) / SPAN) * n
    const i = Math.max(-1, Math.min(n - 1, Math.floor(raw)))
    show(i)
    const wantTyping = kinds[i + 1] === 'bat' && raw - i >= TYPING_AT
    if (typing && wantTyping !== typingOn) {
      typingOn = wantTyping
      typing.classList.toggle('is-on', wantTyping)
    }
  }

  const setLive = (on: boolean) => {
    if (on === live) return
    live = on
    root.classList.toggle('is-live', on)
    document.documentElement.classList.toggle('chat-live', on)
  }

  return { update, measure, setLive }
}

/* Default driver: sticky pin + shared scroll bus. */
export function nativeChatDriver(root: HTMLElement, scene: ChatScene): () => void {
  const stage = root.querySelector<HTMLElement>('.chat__stage')!
  let top = 0
  let range = 1
  const measure = () => {
    top = root.getBoundingClientRect().top + window.scrollY
    range = Math.max(1, root.offsetHeight - stage.offsetHeight) // svh-based, immune to URL-bar resizes
    scene.measure()
  }
  measure()
  const ro = new ResizeObserver(measure)
  ro.observe(root)
  document.fonts?.ready.then(measure)
  window.addEventListener('load', measure, { once: true })

  const stop = onScroll(({ y }) => {
    const p = (y - top) / range
    scene.setLive(p > -0.1 && p < 1.05)
    scene.update(Math.min(1, Math.max(0, p)))
  })
  return () => { stop(); ro.disconnect(); scene.setLive(false) }
}

/* Optional desktop add-on, used only when the lazy GSAP chunk is present. */
export function scrollTriggerChatDriver(
  root: HTMLElement,
  scene: ChatScene,
  gsap: typeof import('gsap').gsap,
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger,
): () => void {
  const st = ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => scene.update(self.progress),
    onRefresh: (self) => { scene.measure(); scene.update(self.progress) },
    onToggle: (self) => scene.setLive(self.isActive),
  })
  const phone = root.querySelector<HTMLElement>('[data-chat-phone]')
  const tilt = phone
    ? gsap.fromTo(phone, { rotate: -2.5, yPercent: 6, scale: 0.97 }, {
        rotate: 0, yPercent: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: root, start: 'top 85%', end: 'top top', scrub: 0.6 },
      })
    : null
  return () => { st.kill(); tilt?.scrollTrigger?.kill(); tilt?.kill(); scene.setLive(false) }
}
```

### 4.6 `main.ts`

```ts
import { fineMQ, lowPower, motionOK, onIdle, reduceMQ } from './motion/env'
import { attachScrollTrigger, disableSmoothScroll, enableSmoothScroll, onScroll, scrollToTarget } from './motion/scroll'
import { initReveals, settleAllReveals } from './motion/reveals'
import { createChatScene, nativeChatDriver, scrollTriggerChatDriver, type ChatScene } from './motion/chat'

const ENHANCE_WITH_GSAP = false
const html = document.documentElement

initReveals()

const header = document.querySelector<HTMLElement>('[data-header]')
let headerHidden = false
onScroll(({ y, dir }) => {
  if (!header || !motionOK()) return
  const hide = dir === 1 && y > 120
  if (hide !== headerHidden) { headerHidden = hide; header.classList.toggle('is-hidden', hide) }
})

document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
  const target = a && document.querySelector<HTMLElement>(a.getAttribute('href')!)
  if (!target) return
  e.preventDefault()
  scrollToTarget(target)
})

const chatRoot = document.querySelector<HTMLElement>('[data-chat]')
let chatScene: ChatScene | null = null
let stopChat: (() => void) | null = null
if (chatRoot && motionOK()) {
  chatScene = createChatScene(chatRoot)
  stopChat = nativeChatDriver(chatRoot, chatScene)
}
html.classList.add('motion-ready') // arms the chat, disarms the reveal failsafe

window.addEventListener('load', () => onIdle(async () => {
  if (!motionOK() || lowPower()) return
  await enableSmoothScroll()
  if (ENHANCE_WITH_GSAP && chatRoot && chatScene && fineMQ.matches && innerWidth >= 900) {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
    if (!motionOK()) return
    gsap.registerPlugin(ScrollTrigger)
    attachScrollTrigger(gsap, ScrollTrigger)
    stopChat?.()
    stopChat = scrollTriggerChatDriver(chatRoot, chatScene, gsap, ScrollTrigger)
  }
}), { once: true })

reduceMQ.addEventListener('change', () => {
  if (!reduceMQ.matches) return // richer mode applies on the next visit
  disableSmoothScroll()
  stopChat?.()
  stopChat = null
  settleAllReveals()
  html.classList.remove('motion', 'motion-ready', 'chat-live')
  header?.classList.remove('is-hidden')
})
```

### 4.7 `styles/motion.css` (the parts the skeleton depends on)

```css
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-bubble: cubic-bezier(0.3, 1.2, 0.5, 1);
  --d-1: 140ms; --d-2: 240ms; --d-3: 380ms; --d-4: 640ms; --d-5: 900ms;
  --rise: 16px;
}
@media (max-width: 700px) { :root { --rise: 12px; } .chat { --slot: 24svh; } }

.header { transition: transform var(--d-2) var(--ease-in-out); background: rgb(255 255 255 / 0.94); }
.header.is-hidden, .chat-live .header { transform: translateY(-100%); }

/* Static defaults = the reduced-motion / no-JS transcript */
.typing { display: none; }
.receipt { text-align: right; font-size: 11px; color: var(--text-2); }

@media (prefers-reduced-motion: no-preference) {
  /* T2 */
  .motion [data-reveal] {
    opacity: 0; translate: 0 var(--rise);
    transition: opacity var(--d-4) var(--ease-out), translate var(--d-4) var(--ease-out);
    transition-delay: var(--reveal-delay, 0ms);
  }
  .motion [data-reveal].is-in { opacity: 1; translate: none; }
  .motion:not(.motion-ready) [data-reveal] { animation: reveal-failsafe 1ms 2.5s forwards; }
  @keyframes reveal-failsafe { to { opacity: 1; translate: none; } }

  /* one-shot highlighter: transform, not background-size */
  .motion [data-reveal="mark"] { position: relative; opacity: 1; translate: none; }
  [data-reveal="mark"]::after {
    content: ""; position: absolute; inset: 55% -0.1em 0; z-index: -1;
    background: var(--highlight); transform: scaleX(0); transform-origin: 0 50%;
    transition: transform 700ms var(--ease-out) 200ms;
  }
  [data-reveal="mark"].is-in::after { transform: none; }

  @supports (animation-timeline: view()) {
    /* T3 */
    .motion-ready [data-reveal="scrub"] {
      transition: none; opacity: 1; translate: none;
      animation: scrub-rise linear both; animation-timeline: view(); animation-range: entry 5% cover 30%;
    }
    @keyframes scrub-rise { from { opacity: 0; translate: 0 32px; } }
    /* T5 + hairline */
    .hero__phone-wrap { animation: drift linear both; animation-timeline: view(); animation-range: exit 0% exit 100%; }
    @keyframes drift { to { translate: 0 -40px; } }
    .progress { transform-origin: 0 50%; animation: grow linear both; animation-timeline: scroll(root); }
    @keyframes grow { from { transform: scaleX(0); } }
  }

  /* T4 */
  .motion .hero h1 { animation: lift var(--d-5) var(--ease-out) both; }
  .motion .hero [data-intro] { animation: rise var(--d-5) var(--ease-out) both; animation-delay: calc(var(--i, 1) * 90ms); }
  @keyframes lift { from { translate: 0 10px; } }
  @keyframes rise { from { opacity: 0; translate: 0 14px; } }
  .hero__phone { animation: breathe 7s ease-in-out 1.2s infinite alternate; }
  .hero:not(.is-visible) .hero__phone { animation-play-state: paused; }
  @keyframes breathe { to { translate: 0 -6px; } }

  /* T6: armed only once the driver exists */
  .motion-ready .chat { height: calc(100svh + var(--steps) * var(--slot, 28vh)); }
  .motion-ready .chat__stage { position: sticky; top: 0; height: 100svh; overflow: clip; contain: layout paint; }
  .motion-ready [data-step] {
    opacity: 0; translate: 0 10px; scale: 0.96;
    transition: opacity var(--d-3) var(--ease-out), translate var(--d-3) var(--ease-bubble), scale var(--d-3) var(--ease-bubble);
  }
  .motion-ready [data-kind="bat"] { transition-delay: 60ms; } /* lands just after the dots leave */
  .motion-ready [data-kind="receipt"] {
    translate: none; scale: none;
    transition: opacity var(--d-2) linear 120ms;
  }
  .motion-ready [data-step].is-shown { opacity: 1; translate: none; scale: none; }
  [data-kind="me"], [data-kind="card"] { transform-origin: 100% 100%; }
  [data-kind="bat"] { transform-origin: 0 100%; }
  svg [data-step] { transform-box: fill-box; } /* inlined-SVG build */

  .motion-ready .thread { transition: transform 420ms var(--ease-out); }
  .chat.is-live .thread { will-change: transform; }

  .motion-ready .typing {
    display: flex; gap: 4px; position: absolute; left: 12px; top: 0;
    width: 44px; height: 30px; padding: 0 10px; align-items: center;
    border-radius: 15px; background: var(--bubble-gray);
    opacity: 0; transition: opacity var(--d-1) linear;
  }
  .motion-ready .typing.is-on { opacity: 1; transition-duration: var(--d-2); }
  .typing i { width: 7px; height: 7px; border-radius: 50%; background: var(--text-2);
    animation: dot 1.2s ease-in-out infinite; animation-play-state: paused; }
  .typing.is-on i { animation-play-state: running; }
  .typing i:nth-child(2) { animation-delay: 0.16s; }
  .typing i:nth-child(3) { animation-delay: 0.32s; }
  @keyframes dot { 0%, 100% { opacity: 0.35; translate: 0 0; } 50% { opacity: 1; translate: 0 -2px; } }
}
```

Without `.motion-ready`, or under reduced motion, the chat section has its natural height, the stage is not sticky, and every step (bubbles, contact card, "Read") is visible with the typing dots hidden. That is a static transcript identical to `images/mockup-intro.svg`.

---

## 5. QA checklist

- [ ] `grep -r "from 'gsap'" src` finds only dynamic imports.
- [ ] Run Lighthouse mobile 3 times; the median meets 3.1.
- [ ] DevTools at 4x CPU slowdown: no long tasks and no per-frame layout through the chat scene, with fewer than 4 promoted layers.
- [ ] iOS Safari and Android Chrome: the sticky stage does not jump when the URL bar collapses, and flinging feels native.
- [ ] With reduced motion on, JS off, or Save-Data on: all content is visible, the intro conversation reads in full (including the "Read" receipt), and nothing is stuck at opacity 0.
- [ ] The intro copy matches the founder's script character for character (straight apostrophes in "I'm" and "I'll").
- [ ] VoiceOver and TalkBack read the conversation in order, the skip link works, and the CTA lands focus on the sign-up input.
- [ ] Firefox: T3 falls back to T2 and nothing breaks.
- [ ] CLS <= 0.02 with the display font throttled to 3 s.

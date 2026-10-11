# Batman brand guide

Batman is an iMessage contact that watches your back when you meet a stranger. It checks in quietly and alerts the friend you chose if you go silent. Secret code words get you out. No app needed.

The brand should feel like a calm, warm, competent friend who has your back at night: playful enough to smile at, steady enough to trust. Light backgrounds, soft shapes, one warm glow.

## Logo concepts considered

Each concept was judged on four things: what it says, whether it reads as friendly and trustworthy, how it survives at 16 px (favicon) and at app-icon size, and how far it sits from DC Comics' Batman marks.

### 1. Night-light crescent
A crescent moon with a small glowing dot beside it, like a night-light left on for you.
- Says: comfort, someone awake while you are out.
- Friendly and calm, but generic. It reads as a sleep, meditation or weather app, and nothing in it says "messaging" or "lookout".
- 16 px: excellent, a crescent survives any size. App icon: pleasant but forgettable.
- Legal distance: very far from DC.
- Verdict: safe but says the wrong product.

### 2. Heart shield with small wings
A rounded shield holding a heart, with two short wings at the shoulders.
- Says: protection and care.
- Trustworthy, but shields with wings read as insignia, security software, or insurance. It feels institutional rather than like a friend.
- 16 px: the wings and heart merge into a blob. App icon: fine.
- Legal distance: the weakest of the set. A winged emblem on a badge pushes toward "superhero chest symbol", the exact territory to avoid.
- Verdict: rejected for tone and legal proximity.

### 3. Cartoon bat face
A round bat head with big ears and two eyes, used as a mascot.
- Says: friendly, a character with a personality.
- Very friendly, but on its own it is just a cute animal. It does not say iMessage, and it risks reading as a Halloween sticker.
- 16 px: the ears hold up, the face does not. App icon: strong.
- Legal distance: far, as long as it stays round and cartoonish.
- Verdict: right warmth, missing the product.

### 4. Bat-ear chat bubble (first pass)
A chat bubble with two pointed ears on top and two eyes inside.
- Says: a contact in your messages who is watching out for you.
- Friendly and specific. In the first render the two triangular ears read as a cat, not a bat, which broke the nod to the name.
- 16 px: the bubble silhouette with ears reads well. App icon: good.
- Legal distance: far.
- Verdict: right idea, wrong animal. Needed one more bat cue.

### 5. Lookout bubble, chosen (refinement of 3 and 4)
The chat bubble from concept 4 with tall, rounded bat ears, two small tucked wings at its sides, glowing eyes and a small smile. The speech-bubble tail stays at the lower left.
- Says: "I'm a message thread, I'm a bat, and I'm looking out for you." Every part maps to the product: the bubble is iMessage, the ears are listening, the open eyes are watching, the smile is the friend.
- Friendly: soft rounded joins everywhere, a smile, warm peach eyes. Trustworthy: a single solid indigo shape, symmetrical, calm, no motion lines or sharp spikes.
- 16 px: ears plus wings plus bubble read as a small bat; the eyes remain two warm dots at 32 px. App icon: the face carries the personality.
- Legal distance: see the legal note below. It is a cartoon creature built from a chat bubble, not an emblem.

## Chosen mark

The **Lookout bubble**: a speech bubble that grew bat ears and little wings, with two porch-light eyes and a small smile. It is a friend in your messages who stays awake for you.

Files:
- `images/logo.svg`: the symbol only, square 256 viewBox, transparent background, for light backgrounds.
- `images/wordmark.svg`: symbol plus custom "batman" lettering, all paths, no fonts.
- `images/logo-square.png` (1024), `images/logo-square-512.png`, `images/apple-touch-icon.png` (180), `images/favicon-32.png`: symbol on the Dusk Lilac tile.
- `images/og-image.png` (1200 x 630): social preview card.
- `images/wordmark.png`: a 1240 px wide preview render of the wordmark.
- `images/mockup-intro.svg`, `images/mockup-intro.png` (1179 x 2556), `images/mockup-intro-square.png` (1080 x 1080): onboarding conversation mockups.

All PNGs are generated from code in this folder: `npm install` then `node render.mjs` (it also runs `mockup.mjs`). The mark itself lives in `mark.mjs`.

### Wordmark lettering
"batman" is set in lowercase custom lettering drawn as stroked SVG paths: geometric single-story a, round-capped terminals, one even stroke weight. Lowercase keeps it conversational, like a name in a contact list, and deliberately avoids the all-caps, heavy, angular lettering associated with superhero titles. Do not retype the wordmark in a font; use the file.

## Color

Light theme is primary. Indigo is the night sky, lilac is dusk, peach is the porch light someone left on for you. The palette deliberately contains no yellow and no black-on-yellow pairing.

| Name | Hex | Usage |
| --- | --- | --- |
| Lookout Indigo | `#3A3191` | The mark, links, primary buttons, key accents |
| Night Ink | `#1C1A33` | Body text, headings, wordmark lettering |
| Moonmilk | `#F7F6FF` | Page background |
| Dusk Lilac | `#E4E0FF` | Icon tile, cards, section bands, avatar background |
| Porch Glow | `#FFA47E` | The eyes and smile in the mark; small highlights on Indigo or Ink only |
| Quiet Slate | `#5B5874` | Secondary text, captions, metadata |

### Contrast (WCAG 2.x)

| Text on background | Ratio | Result |
| --- | --- | --- |
| Night Ink on Moonmilk | 15.73:1 | AAA |
| Night Ink on White | 16.87:1 | AAA |
| Night Ink on Dusk Lilac | 13.18:1 | AAA |
| Lookout Indigo on Moonmilk | 9.65:1 | AAA |
| Lookout Indigo on Dusk Lilac | 8.09:1 | AAA |
| White on Lookout Indigo (buttons) | 10.35:1 | AAA |
| Quiet Slate on Moonmilk | 6.33:1 | AA (AAA large) |
| Quiet Slate on Dusk Lilac | 5.30:1 | AA |
| Moonmilk on Night Ink (dark sections) | 15.73:1 | AAA |
| Porch Glow on Lookout Indigo | 5.36:1 | AA |
| Porch Glow on Night Ink | 8.73:1 | AAA |
| Porch Glow on Moonmilk | 1.80:1 | Fail: never use Porch Glow for text on light backgrounds |

The mockups use generic chat colors: user bubble `#0A7CFF` with white text (3.93:1, passes AA for large text only, matching the familiar platform look) and Batman bubble `#E9E9EB` with `#111114` text (15.55:1). Keep the chat blue inside conversation imagery; never use it for site buttons or body links.

## Typography

Two open-license Google Fonts (SIL Open Font License):

- **Display: Bricolage Grotesque**, weights **600** and **800**. A grotesque with ink-trap warmth and slightly quirky curves; friendly without being childish. Use for headlines and big statements only, sentence case, tracking around -1% to -2% at large sizes.
- **Text: Atkinson Hyperlegible**, weights **400** and **700** (plus italics). Designed by the Braille Institute for maximum character distinction at small sizes and low vision. For a safety product that people read in a hurry, on a phone, at night, legibility is a feature. Use for body copy, UI, captions and chat imagery.

Suggested scale: 56 / 40 / 28 display (Bricolage 800 / 800 / 600), 18 body, 15 small, 13 caption (Atkinson). Line height 1.1 for display, 1.55 for body.

The OG card and mockups are set entirely in Atkinson Hyperlegible because those images are rendered offline from the local font files in `brand/fonts/`.

## Voice and tone

Batman talks like the friend who drove you to the meetup and is waiting around the corner.

- **Calm, never alarming.** "I'll quietly look out for you." Not "Stay safe out there!" Avoid fear words like danger, threat, predator.
- **Short and plain.** Text-message length. One idea per message. Sentence case.
- **Specific about what happens.** Say who gets contacted, when, and how. "If you go quiet for 10 minutes, I'll call you. If you don't answer, I'll text Alfred." Vague reassurance erodes trust.
- **Warm, light humor, sparingly.** A wink at the name is fine ("I'm Batman."). Never jokes about real risk.
- **Discreet.** The product is quiet by design; the copy should be too. No exclamation pile-ups, no hype, no superhero clichés (no "justice", "vigilante", "the night is darkest").
- **No em dashes** in any copy. Use periods, commas, or parentheses.

## Logo usage

- **Clear space:** keep empty space around the symbol equal to at least the height of one ear (one quarter of the symbol's height) on every side. For the wordmark, use the height of the lowercase "a".
- **Minimum size:** symbol 16 px (favicon, on the Lilac tile at 32 px or larger where possible); wordmark 96 px wide on screen, 25 mm in print.
- **Backgrounds:** Indigo symbol on Moonmilk, White, or Dusk Lilac. On Night Ink or photos, place the symbol on a Dusk Lilac tile or circle.
- **Avatar / app icon:** use `logo-square.png`; platforms will mask it to a circle or rounded square and the mark is centered with room for either.

Don't:
- Recolor the body yellow, gold, or black, or put the mark inside an oval or ellipse badge.
- Spread the wings into a full flying-bat silhouette, add extra scallops or points to the wing edges, or remove the bubble body and tail.
- Add a mask, cowl, pointed brow, frown, or angry eyes. The eyes stay round and warm and the smile stays.
- Stretch, skew, rotate, outline, add drop shadows or gradients.
- Retype the wordmark in another font or set it in all caps.
- Use the mark with dark, gritty city imagery.

## Legal distance from DC Comics

"Batman" is a DC Comics trademark, and the brand deliberately keeps clear of DC's protected trade dress:

- **No bat symbol.** The mark is a chat bubble with a face. It is not a spread-wing bat silhouette, not placed in an oval, and not black on yellow. Our wings are two small tucked nubs on the bubble's sides.
- **No cowl, mask, or character.** The creature is a round, smiling cartoon with no mask, ears-on-a-cowl, or costume. It resembles no DC character.
- **No Gotham, Batmobile, or Bat-Signal imagery.** No searchlights, skylines, gargoyles, vehicles, or utility belts anywhere in brand materials.
- **Different color world.** Indigo, lilac, and peach; no yellow, gold, or gray-and-black costume palette.
- **Different lettering.** Soft lowercase rounded lettering, nothing like DC's bold, angular, all-caps title treatments.
- **Different tone.** A friendly safety companion, not a crime fighter.

The name itself is still a DC trademark, and this design work does not change that. For anything beyond a hackathon demo (HackNC 2026), get a trademark review of the name before launch, and keep a renamed version of this identity ready (the mark works with any name).

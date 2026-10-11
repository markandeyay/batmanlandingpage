# Batman landing page

The landing page and sign-up for **Batman**, an iMessage contact that watches your back when you meet a stranger. It checks in quietly and alerts the friend you chose if you go silent. Secret code words get you out. No app needed.

Built at HackNC 2026 for the Photon "Agents in iMessage" track. The bot itself lives in [markandeyay/batman](https://github.com/markandeyay/batman).

## What's here

| Path | What it is |
| --- | --- |
| `index.html` | The whole page: semantic HTML, inline SVG mark, HTML/CSS phone mockups with the real bot copy |
| `src/main.ts` | Boots the motion system, header, demos and sign-up form |
| `src/motion/` | Scroll bus, reveals, pinned chat scene (native `position: sticky` driver), lazy desktop-only Lenis |
| `src/signup.ts` | Phone formatting as you type, friendly validation, result swap |
| `src/styles/main.css` | Tokens from `brand/BRAND.md`, motion from `brand/MOTION.md` |
| `api/signup.ts` | Vercel Function (Node.js runtime) for `POST /api/signup` |
| `api/_lib/signup.ts` | Validation (zod), rate limits, Photon Spectrum calls. Shared with the local dev server |
| `public/fonts/` | Self-hosted Bricolage Grotesque 600/800 and Atkinson Hyperlegible 400/700 (Latin, woff2) with their OFL licenses |
| `brand/` | Brand guide, motion plan and the scripts that render the logo, OG card and mockups |
| `qa/` | Screenshot, performance and API checks |

No framework, no GSAP. Phones download about 4 KB of gzip JS. Desktop adds Lenis (about 5 KB) lazily for smooth wheel scrolling. Everyone with `prefers-reduced-motion: reduce` gets the full page in its final state, with the conversation as a static transcript.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then builds to dist/
npm run preview    # serves dist/ with the local /api/signup
```

Without `PHOTON_PROJECT_ID` and `PHOTON_PROJECT_SECRET`, the local `/api/signup` returns a **mock** number and the page labels it "Demo mode". To try the real flow locally, put both values in a `.env.local` file (it is git-ignored). Mock mode never runs on Vercel: a deployment without the variables answers "Sign-up is not open yet".

### Checks

```sh
npx playwright install chromium   # once
npm run qa         # build, preview, screenshots in qa/shots/, overflow, CLS and console checks
npm run test:api   # sign-up handler against a mocked Photon API
npm run perf       # throttled LCP/CLS (start `npx vite preview --port 4320` first)
node qa/segments.mjs http://localhost:4320 375   # readable slices of the full page
```

## Deploy to Vercel

1. Import `markandeyay/batmanlandingpage` in Vercel (or run `npx vercel` in this folder). The Vite preset is detected: build `npm run build`, output `dist`. Files in `api/` become functions; no `vercel.json` is needed.
2. In Project Settings > Environment Variables, add for Production (and Preview if you want it live there):
   - `PHOTON_PROJECT_ID`
   - `PHOTON_PROJECT_SECRET`
3. Redeploy. Optional: set `SITE_URL` (for example `batman.example.com`) if the OG image should point at a custom domain; otherwise the Vercel production domain is used.

### How sign-up works

`POST /api/signup` with `{ phone, adult: true, website: "" }` and the header `X-Batman-Signup: 1`:

1. Validates with zod: US number normalized to E.164, `adult` must be `true`, the honeypot `website` must be empty (bots get a fake success).
2. Rate limits: 3 per IP per hour and 40 per day overall, in memory per warm instance. For durable limits, move the counters to Vercel KV or Upstash Redis (see the comment in `api/_lib/signup.ts`).
3. `POST https://spectrum.photon.codes/projects/{id}/users/` with Basic auth and `{"type":"shared","phoneNumber":"+1..."}`. Photon returns the existing user for a number that already signed up; if the create call fails, the handler lists users and matches the number.
4. `GET https://spectrum.photon.codes/users/{userId}/redirect` with `redirect: "manual"` and reads the `sms:` link from `Location`.
5. Responds `{ assignedNumber, smsLink }`. The secret is never returned or logged, and phone numbers are logged as their last 4 digits.

## Brand rules worth remembering

- Light theme, Lookout Indigo `#3A3191`, Night Ink `#1C1A33`, Moonmilk `#F7F6FF`, Dusk Lilac `#E4E0FF`, Porch Glow `#FFA47E` (never as text on light backgrounds).
- Batman texts. It does not ring your phone, and it never calls 911.
- No em dashes anywhere.
- "Batman" is a hackathon codename and a DC trademark; get a trademark review before any launch beyond the demo.

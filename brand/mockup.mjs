// Renders the onboarding conversation mockups (phone screenshot + square social post).
// Original SVG drawing; text is set in Atkinson Hyperlegible (OFL) and outlined to paths
// in mockup-intro.svg so it renders identically everywhere.
// Usage (from this folder): node mockup.mjs
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { C, symbol, lettering } from "./mark.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const images = join(here, "..", "images");
const fontOpts = {
  fontFiles: [
    join(here, "fonts", "AtkinsonHyperlegible-Regular.ttf"),
    join(here, "fonts", "AtkinsonHyperlegible-Bold.ttf"),
  ],
  loadSystemFonts: false,
  defaultFontFamily: "Atkinson Hyperlegible",
};
const FONT = "Atkinson Hyperlegible";

const UI = {
  blue: "#0A7CFF",
  gray: "#E9E9EB",
  text: "#111114",
  meta: "#86868C",
  chrome: "#F6F6F9",
  hair: "#D9D9DF",
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// Measure a run of text with resvg itself so wrapping matches the rendered font.
const widthCache = new Map();
const measure = (str, size = 17, weight = 400) => {
  const key = `${size}|${weight}|${str}`;
  if (widthCache.has(key)) return widthCache.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="60"><text x="0" y="40" font-family="${FONT}" font-weight="${weight}" font-size="${size}">${esc(str)}</text></svg>`;
  const b = new Resvg(svg, { font: fontOpts }).getBBox();
  const w = b ? b.x + b.width : 0;
  widthCache.set(key, w);
  return w;
};
const wrap = (str, max, size) => {
  const lines = [];
  let line = "";
  for (const word of str.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next, size) > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  lines.push(line);
  return lines;
};

// Bubble geometry (logical px). Tail only on the last bubble of a run.
const FS = 17, LH = 22, PADX = 13, PADT = 8, PADB = 8;
const tailPath = (side, x, y, w, h) => {
  const b = y + h;
  // A short hooked tail hanging off the lower corner, like a generic chat bubble.
  const d = side === "right" ? 1 : -1;
  const r = side === "right" ? x + w : x;
  const p = (dx, dy) => `${r + d * dx} ${b + dy}`;
  return `M${p(-2, -20)} C${p(-1, -8)} ${p(1, -3)} ${p(6, 0)} C${p(0, 1)} ${p(-7, 0)} ${p(-12, -4)} L${p(-18, -4)} Z`;
};
const bubble = ({ id, side, text, tail = true }, y, W) => {
  const maxText = Math.round(W * 0.7);
  const lines = wrap(text, maxText, FS);
  const tw = Math.max(...lines.map((l) => measure(l, FS)));
  const w = Math.ceil(tw + PADX * 2);
  const h = lines.length * LH + PADT + PADB;
  const x = side === "right" ? W - 16 - w : 16;
  const fill = side === "right" ? UI.blue : UI.gray;
  const ink = side === "right" ? "#FFFFFF" : UI.text;
  const tspans = lines
    .map((l, i) => `<tspan x="${x + PADX}" y="${y + PADT + 16 + i * LH}">${esc(l)}</tspan>`)
    .join("");
  const svg = `<g id="${id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${fill}"/>
    ${tail ? `<path d="${tailPath(side, x, y, w, h)}" fill="${fill}"/>` : ""}
    <text font-family="${FONT}" font-size="${FS}" fill="${ink}">${tspans}</text>
  </g>`;
  return { svg, h, x, w };
};
const typing = (id, y) => `<g id="${id}" opacity="0">
    <rect x="16" y="${y}" width="62" height="36" rx="18" fill="${UI.gray}"/>
    <circle cx="14" cy="${y + 32}" r="6" fill="${UI.gray}"/><circle cx="7" cy="${y + 40}" r="3" fill="${UI.gray}"/>
    <circle cx="34" cy="${y + 18}" r="4" fill="#A3A3A8"/><circle cx="47" cy="${y + 18}" r="4" fill="#BDBDC2"/><circle cx="60" cy="${y + 18}" r="4" fill="#D0D0D4"/>
  </g>`;

const SCRIPT = [
  { id: "msg-1", side: "right", text: "Hi, I'm Robin" },
  { receipt: true },
  { typing: true },
  {
    id: "msg-2",
    side: "left",
    tail: false,
    text: "Hey Robin, I'm Batman. Text me before you meet someone new (a date, a Marketplace pickup, an apartment viewing) and I'll quietly look out for you.",
  },
  {
    id: "msg-3",
    side: "left",
    text: "Quick setup, takes a minute. Who should I contact if you might need help? Send me their name and number, or share their contact card.",
  },
];

// Lays out the thread starting at y within logical width W.
const thread = (y, W, { stamp = true } = {}) => {
  let out = "";
  if (stamp) {
    out += `<g id="timestamp" font-family="${FONT}" font-size="11" fill="${UI.meta}" text-anchor="middle">
      <text x="${W / 2}" y="${y + 11}" font-weight="700">iMessage</text>
      <text x="${W / 2}" y="${y + 25}">Today 6:12 PM</text></g>`;
    y += 42;
  }
  let prevSide = null;
  for (const item of SCRIPT) {
    if (item.receipt) {
      out += `<text id="read-1" x="${W - 18}" y="${y + 13}" text-anchor="end" font-family="${FONT}" font-size="11" fill="${UI.meta}"><tspan font-weight="700">Read</tspan> 6:12 PM</text>`;
      y += 18;
      continue;
    }
    if (item.typing) {
      out += typing("typing", y + 14);
      continue;
    }
    y += prevSide === null ? 0 : prevSide === item.side ? 3 : 14;
    const b = bubble(item, y, W);
    out += b.svg;
    y += b.h;
    prevSide = item.side;
  }
  return { svg: out, end: y };
};

// Simple, generic status bar glyphs (drawn shapes, no platform assets).
const statusBar = (W) => `<g id="status-bar" fill="${UI.text}">
    <text x="50" y="35" font-family="${FONT}" font-weight="700" font-size="16" text-anchor="middle">6:12</text>
    <rect x="${W - 104}" y="27" width="3.5" height="5" rx="1"/><rect x="${W - 99}" y="25" width="3.5" height="7" rx="1"/>
    <rect x="${W - 94}" y="22.5" width="3.5" height="9.5" rx="1"/><rect x="${W - 89}" y="20" width="3.5" height="12" rx="1"/>
    <g fill="none" stroke="${UI.text}" stroke-width="2.2" stroke-linecap="round">
      <path d="M${W - 77} 25.5 a10 10 0 0 1 14 0"/><path d="M${W - 73.5} 29 a5 5 0 0 1 7 0"/>
    </g>
    <circle cx="${W - 70}" cy="32" r="1.6"/>
    <rect x="${W - 54}" y="21" width="25" height="12" rx="3.5" fill="none" stroke="${UI.text}" stroke-opacity="0.4" stroke-width="1.2"/>
    <rect x="${W - 52}" y="23" width="17" height="8" rx="2"/>
    <rect x="${W - 27.5}" y="25" width="1.8" height="4" rx="0.9" fill-opacity="0.4"/>
  </g>`;

const avatar = (cx, cy, r) => {
  const s = (r * 2 * 0.86) / 256;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.lilac}"/>
    <g transform="translate(${cx - 128 * s} ${cy - 134 * s}) scale(${s.toFixed(4)})">${symbol()}</g>`;
};

const header = (W) => `<g id="header">
    <rect width="${W}" height="150" fill="${UI.chrome}"/>
    <rect y="150" width="${W}" height="0.8" fill="${UI.hair}"/>
    ${statusBar(W)}
    <path d="M28 82 L18 92 L28 102" fill="none" stroke="${UI.blue}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${avatar(W / 2, 90, 28)}
    <text x="${W / 2 - 4}" y="138" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${UI.text}">Batman</text>
    <path d="M${W / 2 + 22} 131 l3.5 3.5 l-3.5 3.5" fill="none" stroke="${UI.meta}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const inputBar = (W, H) => `<g id="input-bar">
    <circle cx="33" cy="${H - 70}" r="17" fill="#EEEEF1"/>
    <path d="M33 ${H - 77} v14 M26 ${H - 70} h14" stroke="${UI.meta}" stroke-width="2.2" stroke-linecap="round"/>
    <rect x="58" y="${H - 88}" width="${W - 74}" height="36" rx="18" fill="#FFFFFF" stroke="${UI.hair}" stroke-width="1.2"/>
    <text x="74" y="${H - 64}" font-family="${FONT}" font-size="16" fill="#A6A6AC">Text Message</text>
    <rect x="${W / 2 - 67}" y="${H - 13}" width="134" height="5" rx="2.5" fill="${UI.text}"/>
  </g>`;

// Phone screenshot, logical 393 x 852 (rendered at 3x = 1179 x 2556).
const W = 393, H = 852;
const t = thread(166, W);
const phone = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  ${header(W)}
  <g id="thread">${t.svg}</g>
  ${inputBar(W, H)}
</svg>`;

const render = (svg, file, width) => {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width }, font: fontOpts }).render().asPng();
  writeFileSync(join(images, file), png);
  console.log("wrote", file);
};

// Outline the text so the SVG needs no font; ids on groups survive for animation.
const outlined = new Resvg(phone, { font: fontOpts, shapeRendering: 2, textRendering: 2 }).toString();
writeFileSync(join(images, "mockup-intro.svg"), outlined + "\n");
render(phone, "mockup-intro.png", 1179);

// Square social post, 1080 x 1080: brand tile with the thread on a white card.
const SW = 420; // logical width of the thread inside the card
const st = thread(0, SW, { stamp: false });
const cardPad = 26;
const scale = 2.1;
const cardW = SW * scale, cardH = (st.end + 76 + cardPad) * scale;
const cardX = (1080 - cardW) / 2;
const cardY = 1080 - 64 - cardH;
const square = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${C.lilac}"/>
  <g transform="translate(${cardX - 10} 40) scale(0.44)">${symbol()}</g>
  <g transform="translate(${cardX + 110} 126) scale(0.62)">${lettering(C.ink)}</g>
  <text x="${cardX + cardW}" y="118" text-anchor="end" font-family="${FONT}" font-weight="700" font-size="28" fill="${C.indigo}">No app. Just iMessage.</text>
  <g transform="translate(${cardX} ${cardY}) scale(${scale})">
    <rect width="${SW}" height="${st.end + 76 + cardPad}" rx="26" fill="#FFFFFF"/>
    ${avatar(SW / 2, 30, 18)}
    <text x="${SW / 2}" y="64" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${UI.text}">Batman</text>
    <rect y="76" width="${SW}" height="0.6" fill="${UI.hair}"/>
    <g transform="translate(0 ${76 + cardPad / 2 + 4})">${st.svg}</g>
  </g>
</svg>`;
render(square, "mockup-intro-square.png", 1080);

// Renders the Batman brand assets from hand-written SVG.
// Usage (from this folder): npm install && node render.mjs  (also runs mockup.mjs)
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const images = join(here, "..", "images");
const fonts = [
  join(here, "fonts", "AtkinsonHyperlegible-Regular.ttf"),
  join(here, "fonts", "AtkinsonHyperlegible-Bold.ttf"),
];

import { C, symbol, lettering } from "./mark.mjs";

const svgDoc = (w, h, body, vb = `0 0 ${w} ${h}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>`;

// Square tile: Dusk Lilac background, symbol at a given scale.
const tile = (scale, radius = 0) => {
  const off = (256 - 256 * scale) / 2;
  return svgDoc(256, 256, `
  <rect width="256" height="256" rx="${radius}" fill="${C.lilac}"/>
  <g transform="translate(${off} ${off - 6 * scale}) scale(${scale})">${symbol()}</g>`);
};

const wordmark = () => {
  // symbol 256 grid scaled to 0.62 => ~159 tall; lettering baseline aligned to bubble bottom
  const s = 0.62;
  return svgDoc(620, 140, `
  <g transform="translate(0 -12) scale(${s})">${symbol()}</g>
  <g transform="translate(192 116) scale(0.86)">${lettering(C.ink)}</g>`);
};

const og = () => svgDoc(1200, 630, `
  <rect width="1200" height="630" fill="${C.milk}"/>
  <circle cx="1040" cy="90" r="300" fill="${C.lilac}" opacity="0.55"/>
  <g transform="translate(88 92) scale(0.56)">${symbol()}</g>
  <g transform="translate(250 200) scale(0.92)">${lettering(C.ink)}</g>
  <text x="90" y="318" font-family="Atkinson Hyperlegible" font-weight="700" font-size="44" fill="${C.ink}">
    <tspan x="90">Watches your back when</tspan>
    <tspan x="90" dy="56">you meet a stranger.</tspan>
  </text>
  <text x="90" y="452" font-family="Atkinson Hyperlegible" font-size="27" fill="${C.slate}">
    <tspan x="90">An iMessage contact that checks in quietly and</tspan>
    <tspan x="90" dy="38">alerts the friend you chose if you go silent.</tspan>
    <tspan x="90" dy="38">Secret code words get you out. No app needed.</tspan>
  </text>
  <g font-family="Atkinson Hyperlegible" font-size="22">
    <rect x="740" y="300" width="400" height="84" rx="26" fill="#0A7CFF"/>
    <text fill="#FFFFFF"><tspan x="764" y="334">Marketplace pickup at 6, Target lot</tspan><tspan x="764" dy="30">on Elm. Back by 6:45.</tspan></text>
    <rect x="740" y="404" width="400" height="114" rx="26" fill="#FFFFFF" stroke="${C.lilac}" stroke-width="2"/>
    <circle cx="706" cy="494" r="24" fill="${C.lilac}"/>
    <g transform="translate(686 472) scale(0.156)">${symbol()}</g>
    <text fill="${C.ink}"><tspan x="764" y="438">Got it. I'll keep watch until 6:45.</tspan><tspan x="764" dy="30">Text "pineapple" any time and</tspan><tspan x="764" dy="30">I'll text you an excuse to leave.</tspan></text>
  </g>
  <text x="90" y="580" font-family="Atkinson Hyperlegible" font-weight="700" font-size="20" letter-spacing="1.5" fill="${C.indigo}">HACKNC 2026  ·  AGENTS IN IMESSAGE</text>`);

const render = (svg, file, width) => {
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: "Atkinson Hyperlegible" },
  });
  writeFileSync(join(images, file), r.render().asPng());
  console.log("wrote", file);
};

// Primary symbol SVG (transparent, square viewBox)
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="Batman"><g transform="translate(0 -5)">${symbol()}</g>
</svg>\n`;
writeFileSync(join(images, "logo.svg"), logoSvg);
writeFileSync(join(images, "wordmark.svg"), wordmark().replace("<svg ", '<svg role="img" aria-label="Batman" ') + "\n");

render(tile(0.72), "logo-square.png", 1024);
render(tile(0.72), "logo-square-512.png", 512);
render(tile(0.72), "apple-touch-icon.png", 180);
render(tile(0.94, 48), "favicon-32.png", 32);
render(wordmark(), "wordmark.png", 1240);
render(og(), "og-image.png", 1200);
await import("./mockup.mjs");

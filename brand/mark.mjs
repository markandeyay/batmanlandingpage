// Shared brand tokens and the Batman mark, drawn as plain SVG strings.
export const C = {
  indigo: "#3A3191", // Lookout Indigo
  ink: "#1C1A33", // Night Ink
  milk: "#F7F6FF", // Moonmilk
  lilac: "#E4E0FF", // Dusk Lilac
  glow: "#FFA47E", // Porch Glow
  slate: "#5B5874", // Quiet Slate
};

// The mark, drawn on a 256 grid: a chat bubble that grew bat ears and two small wings.
// Ears and wings are filled + stroked in the same color so every corner is softly rounded.
const mirror = (g) => `<g transform="translate(256 0) scale(-1 1)">${g}</g>`;
const symbolBody = (fill) => {
  const soft = (d, w) => `<path d="${d}" stroke-width="${w}"/>`;
  const ear = soft("M56 136 C50 100 56 62 72 36 C90 52 106 72 116 94 L100 136 Z", 12);
  const wing = soft("M62 128 C46 114 30 108 14 108 C18 124 18 136 16 150 Q36 140 58 154 Z", 8);
  return `
  <g fill="${fill}" stroke="${fill}" stroke-linejoin="round">${ear}${mirror(ear)}${wing}${mirror(wing)}</g>
  <rect x="46" y="88" width="164" height="118" rx="59" fill="${fill}"/>
  <path d="M82 192 C80 212 70 224 52 232 C80 234 104 224 120 206 Z" fill="${fill}"/>`;
};
const symbolFace = (fill) => `
  <ellipse cx="107" cy="142" rx="12" ry="16" fill="${fill}"/>
  <ellipse cx="149" cy="142" rx="12" ry="16" fill="${fill}"/>
  <path d="M118 172 Q128 180 138 172" fill="none" stroke="${fill}" stroke-width="7" stroke-linecap="round"/>`;
export const symbol = (body = C.indigo, face = C.glow) => symbolBody(body) + symbolFace(face);

// Custom lettering "batman", stroke-built on a baseline at y=0, x-height 56.
const letters = `
  <path d="M8 -94 V-28"/><circle cx="36" cy="-28" r="28"/>
  <circle cx="120" cy="-28" r="28"/><path d="M148 -56 V0"/>
  <path d="M188 -82 V-18 Q188 0 206 0"/><path d="M172 -56 H208"/>
  <path d="M234 0 V-56 M234 -32 A22 22 0 0 1 278 -32 V0 M278 -32 A22 22 0 0 1 322 -32 V0"/>
  <circle cx="374" cy="-28" r="28"/><path d="M402 -56 V0"/>
  <path d="M432 0 V-56 M432 -32 A22 22 0 0 1 476 -32 V0"/>`;
export const lettering = (color) =>
  `<g fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">${letters}</g>`;

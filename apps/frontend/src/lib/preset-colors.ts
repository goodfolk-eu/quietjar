// The swatch colour is a utility class rather than a style attribute so it
// survives the site's style-src policy, which has no unsafe-inline.
// Every preset clears 4.5:1 against white text, so no swatch ends up with
// washed-out labels on it.
export const presetColors = [
  { hex: "#0f172a", swatch: "bg-[#0f172a]" },
  { hex: "#0369a1", swatch: "bg-[#0369a1]" },
  { hex: "#047857", swatch: "bg-[#047857]" },
  { hex: "#be123c", swatch: "bg-[#be123c]" },
  { hex: "#c2410c", swatch: "bg-[#c2410c]" },
  { hex: "#6d28d9", swatch: "bg-[#6d28d9]" },
];

// The homepage demo installs the widget the way a customer would: this file
// mirrors the dashboard snippet for the quietjar.com account, adapted for the
// demo slot with the close control disabled so a stray click cannot remove the
// demo for the rest of the session. Kept as a static script file because the
// site's content security policy hashes only Astro's own inline scripts.
window.QuietJar = {
  site: "qj_9bda03856164e93f8b715030",
  currency: "eur",
  // The docs tab shows this goal's meter; the blog and magazine presets
  // clear it with an empty goal in home.json. A met goal hides the widget
  // by default, which would remove the demo from the homepage, so the
  // widget is kept instead, without the bar.
  goal: "qg_48a854f8062f52d0",
  goalReached: "show",
  labels: {
    headline: "Enjoying the docs?",
    body: "Keeps the docs free and current.",
    action: "Donate",
  },
  style: { color: "#0C6C3A", font: "rounded" },
  close: { enabled: false },
  position: { corner: "bottom-right" },
  mount: { target: "#qj-demo-slot" },
};

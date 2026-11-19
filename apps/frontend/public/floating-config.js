// The floating donate button on every page except the homepage, installed the
// way a customer would. The homepage mounts its own floating copy next to the
// inline demo, because there window.QuietJar holds the demo's config. Kept as
// a static script file because the site's content security policy hashes only
// Astro's own inline scripts.
window.QuietJar = {
  site: "qj_9bda03856164e93f8b715030",
  currency: "eur",
  labels: { headline: "Support QuietJar" },
  style: { color: "#0C6C3A", font: "rounded" },
  // The homepage demo shares the widget's dismissal record, so a persisted
  // close here would hide the demo on the next visit.
  close: { after: "never" },
  position: { corner: "bottom-right" },
};

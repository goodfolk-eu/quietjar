export const OPEN_PARAM = "qj_open";

/** True when the visitor arrived through a static image deep link. */
export function shouldAutoOpen(search = window.location.search): boolean {
  const value = new URLSearchParams(search).get(OPEN_PARAM);
  return value !== null && value !== "" && value !== "0";
}

/** Drops the marker so a refresh does not open the panel a second time. */
export function clearOpenParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(OPEN_PARAM)) return;
  url.searchParams.delete(OPEN_PARAM);
  window.history.replaceState(window.history.state, "", url.toString());
}

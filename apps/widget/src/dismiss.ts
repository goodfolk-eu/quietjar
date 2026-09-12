import type { CloseAfterMode } from "./config";

const STORAGE_KEY = "quietjar-dismissed";

export function isDismissed(): boolean {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) !== null) return true;
  } catch {
    // Session storage can be unavailable (blocked cookies, some privacy
    // modes); the durable record below may still apply.
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return false;
    const parsed = JSON.parse(raw) as { until?: string; forever?: boolean };
    if (parsed.forever === true) return true;
    return parsed.until !== undefined && new Date(parsed.until) > new Date();
  } catch {
    // Unavailable or unreadable storage means we simply do not know of a
    // dismissal, which is the same as there not being one.
    return false;
  }
}

export function persistDismissal(mode: CloseAfterMode, days: number): void {
  try {
    if (mode === "session") {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } else if (mode === "days") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ until: daysFromNow(days) }));
    } else if (mode === "forever") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ forever: true }));
    }
    // "never" writes nothing: the widget reappears on the next page load.
  } catch {
    // Without storage the dismissal only lasts for this page view.
  }
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

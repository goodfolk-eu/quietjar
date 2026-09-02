const STORAGE_KEY = "quietjar-dismissed";

export function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // Storage can be unavailable (blocked cookies, some privacy modes);
    // treat the widget as not dismissed rather than hiding it.
    return false;
  }
}

export function persistDismissal(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Without storage the dismissal only lasts for this page view.
  }
}

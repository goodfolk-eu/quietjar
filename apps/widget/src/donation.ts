const STORAGE_KEY = "quietjar-donated";

export interface Donation {
  /** ISO 8601 timestamp of the donation. */
  date: string;
  /** Public site key the donation was made to. */
  site: string;
}

export function readDonation(): Donation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<Donation>;
    if (typeof parsed?.date !== "string" || typeof parsed?.site !== "string") return null;
    return { date: parsed.date, site: parsed.site };
  } catch {
    // Unreadable or unavailable storage means we simply do not know of a
    // donation, which is the same as there not being one.
    return null;
  }
}

export function persistDonation(site: string, date = new Date()): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: date.toISOString(), site }));
  } catch {
    // Without storage the donation is only remembered for this page view.
  }
}

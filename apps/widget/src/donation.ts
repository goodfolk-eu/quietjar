const STORAGE_KEY = "quietjar-donated";

export interface Donation {
  /** ISO 8601 timestamp of the donation. */
  date: string;
  /** Public site key the donation was made to. */
  site: string;
  /** ISO 8601 timestamp until which the widget stays hidden. */
  hideUntil?: string;
}

export function readDonation(): Donation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<Donation>;
    if (typeof parsed?.date !== "string" || typeof parsed?.site !== "string") return null;
    const donation: Donation = { date: parsed.date, site: parsed.site };
    if (typeof parsed.hideUntil === "string") donation.hideUntil = parsed.hideUntil;
    return donation;
  } catch {
    // Unreadable or unavailable storage means we simply do not know of a
    // donation, which is the same as there not being one.
    return null;
  }
}

export function persistDonation(site: string, date: Date, hideDays: number): void {
  try {
    const donation: Donation = {
      date: date.toISOString(),
      site,
      hideUntil: new Date(date.getTime() + hideDays * 24 * 60 * 60 * 1000).toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(donation));
  } catch {
    // Without storage the donation is only remembered for this page view.
  }
}

/** The step-back after a completed donation is still active. */
export function donationHideActive(now = new Date()): boolean {
  const donation = readDonation();
  return donation?.hideUntil !== undefined && new Date(donation.hideUntil) > now;
}

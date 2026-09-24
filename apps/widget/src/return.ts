import { fetchStatus } from "./api";
import { persistDonation } from "./donation";

export const RETURN_PARAM = "qj_donation";

/** The donation row is written by a webhook, which can trail the redirect. */
const ATTEMPTS = 4;
const RETRY_DELAY_MS = 1500;

/** The query part of a hash route, so `#/page?a=1` yields `?a=1`. */
function hashQuery(hash: string): string {
  const index = hash.indexOf("?");
  return index === -1 ? "" : hash.slice(index);
}

function paramFrom(search: string): string | null {
  const value = new URLSearchParams(search).get(RETURN_PARAM);
  return value === null || value.trim() === "" ? null : value;
}

/**
 * A hash-routed page can carry the marker inside its fragment rather than the
 * real query string, either because its router moved it there or because the
 * session predates the fix that puts it before the `#`. Both are read.
 */
export function pendingSessionId(
  search = window.location.search,
  hash = window.location.hash,
): string | null {
  return paramFrom(search) ?? paramFrom(hashQuery(hash));
}

/** Drops the marker so a refresh does not show the thank you a second time. */
export function clearReturnParam(): void {
  const url = new URL(window.location.href);
  const inSearch = url.searchParams.has(RETURN_PARAM);
  const inHash = paramFrom(hashQuery(url.hash)) !== null;
  if (!inSearch && !inHash) return;
  url.searchParams.delete(RETURN_PARAM);
  if (inHash) {
    const index = url.hash.indexOf("?");
    const params = new URLSearchParams(url.hash.slice(index + 1));
    params.delete(RETURN_PARAM);
    const rest = params.toString();
    url.hash = `${url.hash.slice(0, index)}${rest === "" ? "" : `?${rest}`}`;
  }
  window.history.replaceState(window.history.state, "", url.toString());
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves true when the supporter came back from a redirect payment that went
 * through. The marker is cleared either way: a failed or abandoned payment
 * should not keep asking on every navigation.
 */
export async function resolveReturn(options: {
  api: string;
  site: string;
  sessionId: string;
  /** Null skips remembering the donation, for a panel that is not on the creator's site. */
  donationHideDays: number | null;
}): Promise<boolean> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      if ((await fetchStatus(options.api, options.sessionId, options.site)) === "paid") {
        if (options.donationHideDays !== null) {
          persistDonation(options.site, new Date(), options.donationHideDays);
        }
        clearReturnParam();
        return true;
      }
    } catch {
      // A transient failure is indistinguishable from a slow webhook here, so
      // both are handled by trying again.
    }
    if (attempt < ATTEMPTS - 1) await wait(RETRY_DELAY_MS);
  }
  clearReturnParam();
  return false;
}

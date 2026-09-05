import { fetchStatus } from "./api";
import { persistDonation } from "./donation";

export const RETURN_PARAM = "qj_donation";

/** The donation row is written by a webhook, which can trail the redirect. */
const ATTEMPTS = 4;
const RETRY_DELAY_MS = 1500;

export function pendingSessionId(search = window.location.search): string | null {
  const value = new URLSearchParams(search).get(RETURN_PARAM);
  return value === null || value.trim() === "" ? null : value;
}

/** Drops the marker so a refresh does not show the thank you a second time. */
export function clearReturnParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(RETURN_PARAM)) return;
  url.searchParams.delete(RETURN_PARAM);
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
}): Promise<boolean> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      if ((await fetchStatus(options.api, options.sessionId)) === "paid") {
        persistDonation(options.site);
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

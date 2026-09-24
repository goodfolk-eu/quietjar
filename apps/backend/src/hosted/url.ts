function frontendOrigin(): string {
  return process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:4321";
}

export function hostedPageUrl(handle: string): string {
  return `${frontendOrigin()}/@${handle}`;
}

/** Stripe rejects business URLs and wallet domains it cannot reach, such as localhost. */
function isPublicOrigin(origin: string): boolean {
  try {
    return new URL(origin).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * What Stripe shows supporters as the creator's website: their own site when
 * they have one, their hosted page otherwise. Null when neither is reachable,
 * which leaves Stripe to ask for it during onboarding.
 */
export function businessUrlFor(siteUrl: string | null, handle: string | null): string | null {
  if (siteUrl) return siteUrl;
  if (handle === null || !isPublicOrigin(frontendOrigin())) return null;
  return hostedPageUrl(handle);
}

/** The origin hosted pages are served from, when Stripe can register it for wallets. */
export function hostedPageOrigin(): string | null {
  const origin = frontendOrigin();
  return isPublicOrigin(origin) ? origin : null;
}

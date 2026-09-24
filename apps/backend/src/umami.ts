interface UmamiConfig {
  baseUrl: string;
  websiteId: string;
  hostname: string;
}

/**
 * Umami's collector silently discards requests whose User-Agent looks like a
 * bot or is missing, so server-side events need a browser-like value.
 */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/**
 * Build the Umami config from environment variables. Returns undefined when
 * Umami is not configured, so events are skipped (e.g. in local development).
 */
export function umamiFromEnv(): UmamiConfig | undefined {
  const baseUrl = process.env.UMAMI_BASE_URL;
  const websiteId = process.env.UMAMI_WEBSITE_ID;
  if (!baseUrl || !websiteId) return undefined;
  const frontendUrl = process.env.PUBLIC_FRONTEND_URL ?? "http://localhost:4321";
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    websiteId,
    hostname: new URL(frontendUrl).hostname,
  };
}

/**
 * Record a custom event. Fire-and-forget: the caller never waits on Umami and
 * cannot fail because of it. Failures are only logged.
 */
export function trackEvent(name: string): void {
  const config = umamiFromEnv();
  if (!config) return;
  void sendEvent(config, name).catch((err: unknown) => {
    console.error(`[umami:track-failed] ${name}: ${(err as Error).message}`);
  });
}

export async function sendEvent(config: UmamiConfig, name: string): Promise<void> {
  const res = await fetch(`${config.baseUrl}/api/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      type: "event",
      payload: {
        website: config.websiteId,
        hostname: config.hostname,
        url: `/${name}`,
        name,
        language: "en",
      },
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`Umami send failed: HTTP ${res.status} ${await res.text()}`);
  }
}

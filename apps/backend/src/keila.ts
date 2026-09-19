interface KeilaConfig {
  baseUrl: string;
  apiKey: string;
  formId: string;
}

/**
 * Build the Keila REST config from environment variables. Returns undefined
 * when Keila is not configured — the newsletter push is then skipped.
 *
 * The push submits a Keila form that belongs to the product-updates list,
 * because Keila's REST API cannot attach a contact to a list directly.
 */
export function keilaFromEnv(): KeilaConfig | undefined {
  const baseUrl = process.env.KEILA_BASE_URL;
  const apiKey = process.env.KEILA_API_KEY;
  const formId = process.env.KEILA_FORM_ID;
  if (!baseUrl || !apiKey || !formId) return undefined;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey, formId };
}

/**
 * Subscribe an email to the product-updates list. Fire-and-forget: the fetch
 * is started but never awaited by the auth flow, so account creation can
 * neither block on nor fail because of Keila. Failures are logged and the
 * stored opt-in preference stays, so the subscription can be backfilled later.
 */
export function pushSubscriber(user: { id: string; email: string }): void {
  const config = keilaFromEnv();
  if (!config) return;
  void submitSubscriber(config, user).catch((err: unknown) => {
    console.error(`[keila:push-failed] ${user.email}: ${(err as Error).message}`);
  });
}

export async function submitSubscriber(
  config: KeilaConfig,
  user: { id: string; email: string },
): Promise<void> {
  const res = await fetch(`${config.baseUrl}/api/v1/forms/${config.formId}/actions/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        email: user.email,
        external_id: user.id,
        data: {
          productQuietJar: "true",
        },
      },
    }),
    // A hung Keila socket must not pile up unawaited fetches.
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`Keila submit failed: HTTP ${res.status} ${await res.text()}`);
  }
}

interface ScwEmailConfig {
  accessKey: string;
  secretKey: string;
  projectId: string;
  region: string;
  from: { name: string; email: string };
}

/** Parse "QuietJar <no-reply@quietjar.com>" into a name + email pair. */
function parseFrom(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "", email: raw.trim() };
}

/**
 * Build a Scaleway Transactional Email (TEM) REST config from environment
 * variables. Returns undefined when TEM is not configured — callers can then
 * fall back to logging the OTP (handy for local development).
 *
 * Uses the TEM REST API over HTTPS instead of SMTP, because Bunny Magic
 * Containers blocks outbound SMTP ports (25/465/587/2525).
 */
export function scwEmailFromEnv(): ScwEmailConfig | undefined {
  const accessKey = process.env.SCALEWAY_ACCESS_KEY;
  const secretKey = process.env.SCALEWAY_SECRET_KEY;
  const projectId = process.env.SCALEWAY_PROJECT_ID;
  const from = process.env.SMTP_FROM;
  if (!accessKey || !secretKey || !projectId || !from) return undefined;
  return {
    accessKey,
    secretKey,
    projectId,
    region: process.env.SCALEWAY_TEM_REGION ?? "fr-par",
    from: parseFrom(from),
  };
}

const config = scwEmailFromEnv();

/** Send an email via the Scaleway TEM REST API. */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!config) {
    // No TEM configured — surface the email so local testing still works.
    console.warn(
      `[email:SCW-TEM-not-configured] To: ${to} | Subject: ${subject} | Body: ${html.replace(/<[^>]*>/g, " ")}`,
    );
    return;
  }
  const res = await fetch(
    `https://api.scaleway.com/transactional-email/v1alpha1/regions/${config.region}/emails`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": config.secretKey,
        "X-Auth-Access-Key": config.accessKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: [{ email: to }],
        subject,
        html,
        project_id: config.projectId,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Scaleway TEM send failed: HTTP ${res.status} ${await res.text()}`);
  }
}

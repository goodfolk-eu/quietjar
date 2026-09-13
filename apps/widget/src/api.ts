export interface SessionRequest {
  api: string;
  site: string;
  amount: number;
  returnUrl: string;
  /** Goal the donation should count toward; empty when none is configured. */
  goal: string;
}

export interface SessionResponse {
  sessionId: string;
  clientSecret: string;
  publishableKey: string;
  account: string;
  currency: string;
}

export type DonationStatus = "paid" | "pending";

export class ApiError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ApiError";
  }
}

async function errorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `http_${response.status}`;
  } catch {
    return `http_${response.status}`;
  }
}

export async function createSession(input: SessionRequest): Promise<SessionResponse> {
  const response = await fetch(`${input.api}/api/pay/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      site: input.site,
      amount: input.amount,
      returnUrl: input.returnUrl,
      ...(input.goal === "" ? {} : { goal: input.goal }),
    }),
  });
  if (!response.ok) throw new ApiError(await errorCode(response));
  return (await response.json()) as SessionResponse;
}

export async function fetchStatus(
  api: string,
  sessionId: string,
  site?: string,
): Promise<DonationStatus> {
  const params = new URLSearchParams({ session: sessionId });
  if (site) params.set("site", site);
  const response = await fetch(`${api}/api/pay/status?${params.toString()}`);
  if (!response.ok) throw new ApiError(await errorCode(response));
  const body = (await response.json()) as { status?: DonationStatus };
  return body.status === "paid" ? "paid" : "pending";
}

export interface DonationDetailsRequest {
  api: string;
  sessionId: string;
  name: string;
  message: string;
}

/**
 * Sends the optional name and message from the thank-you step. Never throws:
 * a false return means the supporter can try again, and the donation itself
 * is unaffected either way.
 */
export async function saveDonationDetails(input: DonationDetailsRequest): Promise<boolean> {
  try {
    const response = await fetch(`${input.api}/api/pay/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: input.sessionId,
        ...(input.name === "" ? {} : { name: input.name }),
        ...(input.message === "" ? {} : { message: input.message }),
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

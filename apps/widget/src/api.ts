export interface SessionRequest {
  api: string;
  site: string;
  amount: number;
  returnUrl: string;
}

export interface SessionResponse {
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
    }),
  });
  if (!response.ok) throw new ApiError(await errorCode(response));
  return (await response.json()) as SessionResponse;
}

export async function fetchStatus(api: string, sessionId: string): Promise<DonationStatus> {
  const url = `${api}/api/pay/status?session=${encodeURIComponent(sessionId)}`;
  const response = await fetch(url);
  if (!response.ok) throw new ApiError(await errorCode(response));
  const body = (await response.json()) as { status?: DonationStatus };
  return body.status === "paid" ? "paid" : "pending";
}

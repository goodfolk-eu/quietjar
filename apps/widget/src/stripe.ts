/**
 * The slice of Stripe.js the container uses. Pinned to a named release so the
 * API surface cannot shift under a widget bundle that is already deployed on
 * someone's site.
 */
const SCRIPT_SRC = "https://js.stripe.com/clover/stripe.js";

export interface CheckoutTotal {
  amount: string;
}

export interface CheckoutSession {
  canConfirm: boolean;
  total: { total: CheckoutTotal };
}

export interface StripeElement {
  mount(target: HTMLElement | string): void;
  unmount(): void;
  destroy(): void;
}

export type ConfirmResult =
  | { type: "error"; error: { message?: string } }
  | { type: "success"; error?: undefined };

export interface CheckoutActions {
  confirm(): Promise<ConfirmResult>;
  validateElements(): Promise<ConfirmResult>;
  getSession(): CheckoutSession;
}

export interface CheckoutSdk {
  on(event: "change", handler: (session: CheckoutSession) => void): void;
  /** Collects the supporter's email, which the session needs before it can confirm. */
  createContactDetailsElement(): StripeElement;
  createPaymentElement(): StripeElement;
  loadActions(): Promise<{ actions: CheckoutActions }>;
}

export interface CheckoutOptions {
  clientSecret: string | Promise<string>;
  elementsOptions?: { appearance?: Record<string, unknown> };
}

export interface StripeClient {
  initCheckoutElementsSdk(options: CheckoutOptions): CheckoutSdk;
}

type StripeConstructor = (key: string, options?: { stripeAccount?: string }) => StripeClient;

declare global {
  interface Window {
    Stripe?: StripeConstructor;
  }
}

export class StripeUnavailableError extends Error {
  constructor(readonly reason: "blocked" | "unsupported") {
    super(reason);
    this.name = "StripeUnavailableError";
  }
}

let pending: Promise<StripeConstructor> | undefined;

function supported(candidate: StripeConstructor | undefined): candidate is StripeConstructor {
  return typeof candidate === "function";
}

/**
 * Injects Stripe.js into the host page once. A site with a strict
 * `script-src` policy rejects it, which is the one failure the container has
 * to be able to explain to a visitor.
 */
export function loadStripe(): Promise<StripeConstructor> {
  if (supported(window.Stripe)) return Promise.resolve(window.Stripe);
  if (pending) return pending;

  pending = new Promise<StripeConstructor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    const settle = () => {
      if (supported(window.Stripe)) {
        resolve(window.Stripe);
      } else {
        reject(new StripeUnavailableError("unsupported"));
      }
    };

    script.addEventListener("load", settle, { once: true });
    script.addEventListener("error", () => reject(new StripeUnavailableError("blocked")), {
      once: true,
    });

    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.append(script);
    }
  });

  // A failed load should not poison later attempts: a visitor may retry.
  pending.catch(() => {
    pending = undefined;
  });
  return pending;
}

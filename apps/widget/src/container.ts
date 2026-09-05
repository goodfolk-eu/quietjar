import { ApiError, createSession } from "./api";
import { MAX_AMOUNT, MIN_AMOUNT, type ResolvedConfig } from "./config";
import { persistDonation } from "./donation";
import { formatAmount } from "./money";
import { computePlacement } from "./position";
import { loadStripe, type StripeElement, StripeUnavailableError } from "./stripe";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const INSTANT_CLASS = "quietjar-panel--instant";
const CONTACT_SLOT = "quietjar-contact";
const PAYMENT_SLOT = "quietjar-payment";
const FOOTER_URL = "https://quietjar.com";
const FOOTER_LABEL = "Powered by QuietJar";
const LOADING_MESSAGE = "Loading the payment form...";

const MESSAGES: Record<string, string> = {
  blocked: "This site's security policy blocks the payment form.",
  unsupported: "The payment form could not start here.",
  unknown_site: "Payments are not set up for this site yet.",
  origin_not_allowed: "Payments are not set up for this site yet.",
  not_connected: "Payments are not set up for this site yet.",
  payments_not_enabled: "Payments are not set up for this site yet.",
  invalid_return_url: "Payments are not set up for this site yet.",
  invalid_amount: "Choose a different amount.",
  rate_limited: "Too many attempts. Try again in a minute.",
};
const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export interface ContainerOptions {
  config: ResolvedConfig;
  /**
   * Element the container is placed against. The whole widget face, not just
   * its trigger, so the container clears a card instead of covering its text.
   */
  anchor: HTMLElement;
  /** Control that opened the container, and is returned to on minimize. */
  trigger: HTMLElement;
  /** Host element of the shadow root; the Stripe element mounts under it. */
  host: HTMLElement;
  onVisibilityChange?(open: boolean): void;
}

export interface PaymentContainer {
  element: HTMLElement;
  open(): void;
  close(): void;
  showThanks(): void;
  isOpen(): boolean;
}

export function createPaymentContainer(options: ContainerOptions): PaymentContainer {
  const { config, anchor, trigger, host } = options;

  const panel = document.createElement("div");
  panel.className = "quietjar-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", config.headline !== "" ? config.headline : FOOTER_LABEL);
  // Closed from the start: without a state the panel's resting style is fully
  // visible, which flashes before the entrance animation can begin.
  panel.dataset.state = "closed";
  panel.hidden = true;

  const head = document.createElement("div");
  head.className = "quietjar-panel__head";
  const title = document.createElement("div");
  title.className = "quietjar-panel__title";
  title.textContent = config.headline !== "" ? config.headline : FOOTER_LABEL;
  const minimize = iconButton("quietjar-panel__minimize", config.minimizeLabel, chevronIcon());
  head.append(title, minimize);

  const body = document.createElement("div");
  body.className = "quietjar-panel__body";

  const footer = document.createElement("div");
  footer.className = "quietjar-panel__footer";
  const footerLink = document.createElement("a");
  footerLink.className = "quietjar-panel__powered";
  footerLink.href = FOOTER_URL;
  footerLink.target = "_blank";
  footerLink.rel = "noopener noreferrer";
  footerLink.textContent = FOOTER_LABEL;
  footer.append(footerLink);

  panel.append(head, body, footer);

  let open = false;
  let amount = config.amounts[0];
  const mountedElements: StripeElement[] = [];
  const lightMounts: HTMLElement[] = [];

  function reposition(): void {
    if (!open) return;
    const anchorRect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const placement = computePlacement(
      {
        top: anchorRect.top,
        left: anchorRect.left,
        width: anchorRect.width,
        height: anchorRect.height,
      },
      { top: 0, left: 0, width: panelRect.width, height: panelRect.height },
      { width: window.innerWidth, height: window.innerHeight },
    );
    panel.classList.toggle("quietjar-panel--sheet", placement.sheet);
    panel.style.maxHeight = `${placement.maxHeight}px`;
    if (placement.sheet) {
      panel.style.left = "0px";
      panel.style.top = "auto";
    } else {
      panel.style.left = `${placement.left}px`;
      panel.style.top = `${placement.top}px`;
    }
  }

  let exitTimer: ReturnType<typeof setTimeout> | undefined;

  const sizeObserver =
    typeof ResizeObserver === "function" ? new ResizeObserver(() => reposition()) : undefined;

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") close();
  }

  function teardownPaymentElement(): void {
    for (const element of mountedElements.splice(0)) {
      element.destroy();
    }
    for (const node of lightMounts.splice(0)) {
      node.remove();
    }
  }

  function show(): void {
    if (open) return;
    clearTimeout(exitTimer);
    open = true;
    panel.hidden = false;
    // Rendered at the closed offset first, so the browser has a value to
    // animate from once the state flips on the next frame.
    // Content first: the docked sheet's closed offset is a percentage of the
    // panel's own height, so an empty panel would start barely off the edge.
    panel.classList.add(INSTANT_CLASS);
    renderAmountStep();
    reposition();
    // Reading the layout commits the closed offset as the transition's start
    // value, with transitions held so the panel does not animate into it.
    void panel.offsetHeight;
    panel.classList.remove(INSTANT_CLASS);
    requestFrame(() => {
      if (open) panel.dataset.state = "open";
    });
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, { passive: true });
    document.addEventListener("keydown", onKeydown);
    // The Stripe element settles on its height after it has mounted, and each
    // step is a different size, so the placement has to follow the panel.
    sizeObserver?.observe(panel);
    options.onVisibilityChange?.(true);
    // The amount is the first decision; the minimize control comes first in the
    // DOM but is not where a supporter wants to land.
    const first = panel.querySelector<HTMLButtonElement>(".quietjar-panel__amount");
    (first ?? panel.querySelector<HTMLButtonElement>("button"))?.focus();
  }

  function close(): void {
    if (!open) return;
    open = false;
    panel.dataset.state = "closed";
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition);
    document.removeEventListener("keydown", onKeydown);
    // Observing a panel that is animating out would fight the exit transform.
    sizeObserver?.disconnect();
    options.onVisibilityChange?.(false);
    trigger.focus();

    // The panel stays in the tree until it has slid out; tearing the Stripe
    // elements down first would blank it mid-animation.
    clearTimeout(exitTimer);
    exitTimer = setTimeout(() => {
      if (open) return;
      panel.hidden = true;
      teardownPaymentElement();
    }, exitDuration());
  }

  minimize.addEventListener("click", close);

  function renderAmountStep(): void {
    teardownPaymentElement();
    body.replaceChildren();

    const choices = document.createElement("div");
    choices.className = "quietjar-panel__amounts";

    const custom = document.createElement("input");
    custom.className = "quietjar-panel__custom";
    custom.type = "number";
    custom.min = String(MIN_AMOUNT);
    custom.max = String(MAX_AMOUNT);
    custom.step = "1";
    custom.placeholder = config.otherLabel;
    custom.hidden = true;
    custom.setAttribute("aria-label", config.otherLabel);

    const submit = document.createElement("button");
    submit.type = "button";
    submit.className = "quietjar-panel__submit";

    function syncSubmit(): void {
      const valid = amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
      submit.disabled = !valid;
      submit.textContent = valid
        ? `${config.actionLabel} ${formatAmount(amount, config.currency)}`
        : config.actionLabel;
    }

    const presets = config.amounts.map((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quietjar-panel__amount";
      button.textContent = formatAmount(value, config.currency);
      button.setAttribute("aria-pressed", String(value === amount));
      button.addEventListener("click", () => {
        amount = value;
        custom.hidden = true;
        custom.value = "";
        updatePressed(value);
        syncSubmit();
      });
      return { value, button };
    });

    const other = document.createElement("button");
    other.type = "button";
    other.className = "quietjar-panel__amount quietjar-panel__amount--other";
    other.textContent = config.otherLabel;
    other.setAttribute("aria-pressed", "false");

    function updatePressed(selected: number | null): void {
      for (const preset of presets) {
        preset.button.setAttribute("aria-pressed", String(preset.value === selected));
      }
      other.setAttribute("aria-pressed", String(selected === null));
    }

    other.addEventListener("click", () => {
      custom.hidden = false;
      amount = Number.NaN;
      updatePressed(null);
      syncSubmit();
      custom.focus();
    });

    custom.addEventListener("input", () => {
      amount = custom.value === "" ? Number.NaN : Number(custom.value);
      syncSubmit();
    });

    choices.append(...presets.map((preset) => preset.button), other);
    submit.addEventListener("click", () => {
      void startPayment(amount);
    });

    syncSubmit();
    body.append(choices, custom, submit);
    reposition();
  }

  function renderMessage(className: string, text: string): HTMLParagraphElement {
    const message = document.createElement("p");
    message.className = className;
    message.textContent = text;
    return message;
  }

  function renderError(text: string): void {
    body.replaceChildren();
    body.append(renderMessage("quietjar-panel__error", text));

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "quietjar-panel__submit";
    retry.textContent = "Try again";
    retry.addEventListener("click", renderAmountStep);
    body.append(retry);
    reposition();
  }

  function showThanks(): void {
    teardownPaymentElement();
    body.replaceChildren(renderMessage("quietjar-panel__thanks", config.thanksLabel));
    reposition();
  }

  /**
   * Stripe.js refuses to mount inside a shadow root ("payment Element didn't
   * mount normally"), so each element goes into a light-DOM node that a slot
   * projects back into the container. Inline styles because the node lives on
   * the host page, where the site's own stylesheet can reach it.
   */
  function mountStripeElement(element: StripeElement, target: HTMLElement, slotName: string): void {
    const light = document.createElement("div");
    light.slot = slotName;
    light.style.cssText = "display: block; width: 100%; margin: 0; padding: 0;";
    host.append(light);
    lightMounts.push(light);

    const slot = document.createElement("slot");
    slot.name = slotName;
    target.replaceChildren(slot);
    element.mount(light);
    mountedElements.push(element);
  }

  async function startPayment(chosen: number): Promise<void> {
    if (config.site === "") {
      renderError(MESSAGES.unknown_site);
      return;
    }

    body.replaceChildren(renderMessage("quietjar-panel__loading", LOADING_MESSAGE));
    reposition();

    try {
      const stripeConstructor = await loadStripe();
      const session = await createSession({
        api: config.api,
        site: config.site,
        amount: chosen,
        returnUrl: returnUrl(),
      });

      const stripe = stripeConstructor(session.publishableKey, { stripeAccount: session.account });
      const checkout = stripe.initCheckoutElementsSdk({
        clientSecret: session.clientSecret,
        elementsOptions: { appearance: appearanceFor(config) },
      });

      body.replaceChildren();
      body.append(backRow(chosen));

      const contactTarget = document.createElement("div");
      contactTarget.className = "quietjar-panel__element";
      const mountTarget = document.createElement("div");
      mountTarget.className = "quietjar-panel__element";
      body.append(contactTarget, mountTarget);

      const pay = document.createElement("button");
      pay.type = "button";
      pay.className = "quietjar-panel__submit";
      pay.disabled = true;
      pay.textContent = `${config.actionLabel} ${formatAmount(chosen, config.currency)}`;
      const error = renderMessage("quietjar-panel__error", "");
      error.hidden = true;
      body.append(pay, error);

      // Stripe owns the total once the session exists, so the button label
      // follows the session rather than the amount we asked for.
      checkout.on("change", (state) => {
        pay.textContent = `${config.actionLabel} ${state.total.total.amount}`;
      });

      // The session cannot confirm without an email, and the Contact Details
      // Element is what collects it. It also offers Link sign-in.
      mountStripeElement(checkout.createContactDetailsElement(), contactTarget, CONTACT_SLOT);
      mountStripeElement(checkout.createPaymentElement(), mountTarget, PAYMENT_SLOT);
      reposition();

      const { actions } = await checkout.loadActions();
      // Enabled once Stripe can take a confirmation. Gating on the session's
      // canConfirm instead would leave the button dead with no explanation when
      // a field is missing; validating on click says what is wrong.
      pay.disabled = false;
      pay.addEventListener("click", async () => {
        pay.disabled = true;
        error.hidden = true;

        if ((await actions.validateElements()).type === "error") {
          // Stripe marks the offending fields with its own messages; a generic
          // line underneath them only adds noise.
          pay.disabled = false;
          reposition();
          return;
        }

        const result = await actions.confirm();
        if (result.type === "error") {
          error.textContent = result.error.message ?? FALLBACK_MESSAGE;
          error.hidden = false;
          pay.disabled = false;
          reposition();
          return;
        }
        // Redirect methods never reach this point: the browser has already
        // left for the bank by the time confirm settles.
        persistDonation(config.site);
        showThanks();
      });
    } catch (err) {
      renderError(messageFor(err));
    }
  }

  function backRow(chosen: number): HTMLElement {
    const row = document.createElement("div");
    row.className = "quietjar-panel__back-row";
    const back = iconButton("quietjar-panel__back", "Back", chevronIcon("left"));
    back.addEventListener("click", renderAmountStep);
    const label = document.createElement("span");
    label.className = "quietjar-panel__amount-label";
    label.textContent = formatAmount(chosen, config.currency);
    row.append(back, label);
    return row;
  }

  return {
    element: panel,
    open: show,
    close,
    showThanks,
    isOpen: () => open,
  };
}

/** Matches the panel's exit transition in `styles.ts`. */
const EXIT_MS = 200;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function exitDuration(): number {
  return prefersReducedMotion() ? 0 : EXIT_MS;
}

/** Falls back to a timeout where requestAnimationFrame is unavailable. */
function requestFrame(callback: () => void): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(callback);
    return;
  }
  setTimeout(callback, 0);
}

function messageFor(err: unknown): string {
  if (err instanceof StripeUnavailableError) return MESSAGES[err.reason] ?? FALLBACK_MESSAGE;
  if (err instanceof ApiError) return MESSAGES[err.code] ?? FALLBACK_MESSAGE;
  return FALLBACK_MESSAGE;
}

/** The page the supporter is on, without a stale donation marker on it. */
function returnUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("qj_donation");
  return url.toString();
}

function appearanceFor(config: ResolvedConfig): Record<string, unknown> {
  return {
    variables: {
      colorPrimary: config.color,
      borderRadius: "8px",
      fontSizeBase: "14px",
    },
  };
}

function iconButton(className: string, label: string, icon: SVGSVGElement): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.append(icon);
  return button;
}

function chevronIcon(direction: "down" | "left" = "down"): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", direction === "down" ? "M5 9l7 7 7-7" : "M15 5l-7 7 7 7");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

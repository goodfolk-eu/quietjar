import { type QuietJarConfig, resolveConfig } from "./config";
import { isDismissed } from "./dismiss";
import { donationHideActive } from "./donation";
import { mountWidget, paymentContainer } from "./mount";
import { pendingSessionId, resolveReturn } from "./return";

declare global {
  interface Window {
    QuietJar?: QuietJarConfig;
  }
}

export function mount(): void {
  if (isDismissed() || donationHideActive()) {
    return;
  }
  const config = resolveConfig(window.QuietJar);
  const host = mountWidget(config, { persistDismissal: true });

  // A redirect payment method sends the supporter back here rather than to the
  // container it started in, so the thank you has to be picked back up.
  const sessionId = pendingSessionId();
  if (sessionId === null || config.site === "") return;

  const container = paymentContainer(host);
  if (!container) return;
  void resolveReturn({
    api: config.api,
    site: config.site,
    sessionId,
    donationHideDays: config.donationHideDays,
  }).then((paid) => {
    if (!paid) return;
    container.open();
    container.showThanks(sessionId);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}

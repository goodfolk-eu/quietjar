import { type QuietJarConfig, resolveConfig } from "./config";
import { isDismissed } from "./dismiss";
import { donationHideActive } from "./donation";
import { mountWidget, paymentContainer } from "./mount";
import { clearOpenParam, shouldAutoOpen } from "./open";
import { pendingSessionId, resolveReturn } from "./return";

declare global {
  interface Window {
    QuietJar?: QuietJarConfig;
  }
}

export function mount(): void {
  const config = resolveConfig(window.QuietJar);
  // A deep link from a static image opens the panel no matter what state the
  // widget is in: the supporter clicked a donate button to get here.
  const autoOpen = shouldAutoOpen();
  if (!autoOpen && (isDismissed() || donationHideActive())) {
    return;
  }
  const host = mountWidget(config, { persistDismissal: true });
  const container = paymentContainer(host);
  if (!container) return;

  if (autoOpen) {
    if (config.site !== "") {
      container.open({ modal: true });
    }
    clearOpenParam();
    return;
  }

  // A redirect payment method sends the supporter back here rather than to the
  // container it started in, so the thank you has to be picked back up.
  const sessionId = pendingSessionId();
  if (sessionId === null || config.site === "") return;

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

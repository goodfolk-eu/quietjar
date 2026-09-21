import { type QuietJarConfig, resolveConfig } from "./config";
import { isDismissed } from "./dismiss";
import { donationHideActive } from "./donation";
import { fetchGoalProgress, widgetHidden } from "./goal";
import { type MountOptions, mountWidget, paymentContainer } from "./mount";
import { clearOpenParam, shouldAutoOpen } from "./open";
import { pendingSessionId, resolveReturn } from "./return";

declare global {
  interface Window {
    QuietJar?: QuietJarConfig & { open?(): void };
  }
}

// The mounted widget host. Undefined while the widget is not on the page: a
// suppressed boot never mounts, and a visitor closing the widget removes it.
let host: HTMLElement | undefined;

// An owner-invoked open always opens the checkout. When the widget is not on
// the page it mounts again past every suppression, and the panel centers like
// a deep link open.
function openPanel(): void {
  if (host?.isConnected) {
    paymentContainer(host)?.open();
    return;
  }
  host = mountWidget(resolveConfig(window.QuietJar), { persistDismissal: true });
  const container = paymentContainer(host);
  container?.open({ modal: true });
}

// Attached when the script runs and again on every mount, so a config object
// assigned after the script loaded still gains the method.
function exposeOpen(): void {
  window.QuietJar ??= {};
  const target = window.QuietJar as QuietJarConfig & { open?(): void };
  target.open = openPanel;
}

exposeOpen();

export async function mount(): Promise<void> {
  exposeOpen();
  const config = resolveConfig(window.QuietJar);
  // A deep link from a static image opens the panel no matter what state the
  // widget is in: the supporter clicked a donate button to get here.
  const autoOpen = shouldAutoOpen();
  if (!autoOpen && (isDismissed() || donationHideActive())) {
    return;
  }
  const options: MountOptions = { persistDismissal: true };
  // Whether a reached goal hides the widget or only drops its bar, the answer
  // only arrives with the progress, so the face waits for it rather than
  // appearing and then changing shape. A bar that stays on regardless needs no
  // such wait, and neither does a deep link, which shows the widget either way
  // and should not hold the panel back on a lookup.
  if (!autoOpen && config.goal !== "" && config.goalReached !== "show-with-bar") {
    const progress = await fetchGoalProgress(config.api, config.goal);
    if (widgetHidden(config.goalReached, progress)) return;
    options.progress = progress;
  }
  host = mountWidget(config, options);
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
  document.addEventListener("DOMContentLoaded", () => void mount(), { once: true });
} else {
  void mount();
}

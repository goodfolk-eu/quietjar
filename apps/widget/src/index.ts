import { type QuietJarConfig, resolveConfig } from "./config";
import { isDismissed } from "./dismiss";
import { donationHideActive } from "./donation";
import { fetchGoalProgress, widgetHidden } from "./goal";
import { type MountOptions, mountWidget, paymentContainer } from "./mount";
import { clearOpenParam, shouldAutoOpen } from "./open";
import { pendingSessionId, resolveReturn } from "./return";

declare global {
  interface Window {
    QuietJar?: QuietJarConfig;
  }
}

export async function mount(): Promise<void> {
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
  const host = mountWidget(config, options);
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

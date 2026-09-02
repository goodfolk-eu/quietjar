import { type QuietJarConfig, resolveConfig } from "./config";
import { isDismissed } from "./dismiss";
import { mountWidget } from "./mount";

declare global {
  interface Window {
    QuietJar?: QuietJarConfig;
  }
}

export function mount(): void {
  if (isDismissed()) {
    return;
  }
  mountWidget(resolveConfig(window.QuietJar), { persistDismissal: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}

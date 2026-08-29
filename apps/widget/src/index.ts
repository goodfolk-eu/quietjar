import { type QuietJarConfig, resolveConfig } from "./config";
import { mountWidget } from "./mount";

declare global {
  interface Window {
    QuietJar?: QuietJarConfig;
  }
}

export function mount(): void {
  mountWidget(resolveConfig(window.QuietJar));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}

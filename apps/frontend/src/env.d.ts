/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="astro-icon" />

import type { QuietJarConfig } from "@quietjar/widget/config";

declare global {
  interface Window {
    __quietjarAuthOpen?: (mode: "login" | "signup" | string) => void;
    QuietJar?: QuietJarConfig;
  }
}

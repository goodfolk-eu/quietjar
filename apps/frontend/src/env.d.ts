/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="astro-icon" />

declare global {
  interface Window {
    __quietjarAuthOpen?: (mode: "login" | "signup" | string) => void;
  }
}

export {};

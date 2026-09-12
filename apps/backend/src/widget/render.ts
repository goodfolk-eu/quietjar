/**
 * Renders a widget face to PNG by loading the real widget bundle in a
 * headless view and screenshotting the pill or card element. The image is
 * therefore pixel-faithful to whatever the widget ships, with no second
 * implementation of the button's look to keep in sync.
 */
import { existsSync } from "node:fs";
import { encodeImageConfig } from "./storage";

/** Transparent margin around the face so antialiasing and shadows survive. */
const CLIP_PADDING = 12;
const VIEWPORT_WIDTH = 480;
const VIEWPORT_HEIGHT = 360;
/** Mirrors FACE_SELECTOR in apps/widget/src/mount.ts; the backend cannot
    import the widget workspace, so the copy is kept in sync by hand. */
const FACE_SELECTOR = ".quietjar-widget__button, .quietjar-widget__panel";
const MOUNT_TIMEOUT_ATTEMPTS = 30;
const MOUNT_POLL_MS = 100;

interface FaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Chrome everywhere a real render happens: production Linux needs an explicit
 * binary (chrome-headless-shell in the image). Anywhere a Chrome-family
 * browser is installed, including macOS dev, it gives the transparent clipped
 * capture. The system WKWebView is only a last resort: it cannot drive the
 * DevTools protocol, so its screenshot is an opaque viewport shot.
 */
function resolveBackend(): "webkit" | "chrome" | { type: "chrome"; path: string; argv: string[] } {
  const chromePath = process.env.BUN_CHROME_PATH;
  // A configured path means the container image: user namespaces are usually
  // unavailable there, so chrome needs its sandbox disabled.
  if (chromePath) return { type: "chrome", path: chromePath, argv: ["--no-sandbox"] };
  if (chromeInstalled()) return "chrome";
  return "webkit";
}

/** Mirrors Bun.WebView's own Chrome search so the fallback is predictable. */
function chromeInstalled(): boolean {
  const names = [
    "google-chrome-stable",
    "google-chrome",
    "chromium-browser",
    "chromium",
    "brave-browser",
    "microsoft-edge",
  ];
  if (names.some((name) => Bun.which(name) !== "")) return true;
  if (process.platform === "darwin") {
    const apps = ["Google Chrome", "Chromium", "Microsoft Edge", "Brave Browser"];
    return apps.some((app) => existsSync(`/Applications/${app}.app`));
  }
  return false;
}

const FACE_SCRIPT = `(() => {
  const root = document.querySelector("[data-quietjar-host]")?.shadowRoot;
  const face = root?.querySelector(${JSON.stringify(FACE_SELECTOR)});
  if (!face) return null;
  const rect = face.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
})()`;

/** The page served by the widget routes; it mounts the widget from the blob. */
function renderPageUrl(origin: string, config: object): string {
  const blob = encodeImageConfig(config);
  return `${origin}/widget/render?c=${encodeURIComponent(blob)}`;
}

async function waitUntilMounted(view: Bun.WebView): Promise<FaceRect> {
  for (let attempt = 0; attempt < MOUNT_TIMEOUT_ATTEMPTS; attempt += 1) {
    const rect = (await view.evaluate(FACE_SCRIPT)) as FaceRect | null;
    if (rect) return rect;
    await Bun.sleep(MOUNT_POLL_MS);
  }
  throw new Error("widget face did not render");
}

async function captureFace(view: Bun.WebView, face: FaceRect): Promise<Uint8Array<ArrayBuffer>> {
  const usesCdp = resolveBackend() !== "webkit";
  if (usesCdp) {
    // The high-level screenshot always paints the viewport background; the
    // raw protocol call is what makes the PNG transparent around the face.
    await view.cdp("Emulation.setDefaultBackgroundColorOverride", {
      color: { r: 0, g: 0, b: 0, a: 0 },
    });
    const shot = (await view.cdp("Page.captureScreenshot", {
      format: "png",
      clip: {
        x: Math.max(0, face.x - CLIP_PADDING),
        y: Math.max(0, face.y - CLIP_PADDING),
        width: face.width + CLIP_PADDING * 2,
        height: face.height + CLIP_PADDING * 2,
        scale: 2,
      },
      captureBeyondViewport: true,
    })) as { data?: string };
    if (!shot.data) throw new Error("screenshot returned no data");
    return new Uint8Array(Buffer.from(shot.data, "base64"));
  }
  // WebKit dev fallback: no DevTools bridge, so an opaque viewport shot.
  const blob = await view.screenshot({ format: "png", encoding: "buffer" });
  return new Uint8Array(blob);
}

async function renderOnce(config: object): Promise<Uint8Array<ArrayBuffer>> {
  const port = Number(process.env.PORT ?? 3000);
  const view = new Bun.WebView({
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    backend: resolveBackend(),
  });
  try {
    await view.navigate(renderPageUrl(`http://127.0.0.1:${port}`, config));
    const face = await waitUntilMounted(view);
    return await captureFace(view, face);
  } finally {
    view.close();
  }
}

// One render at a time: each spins up a renderer process, and the queue keeps
// a burst of cache misses from multiplying those.
let queue: Promise<unknown> = Promise.resolve();

export function renderWidgetImage(config: object): Promise<Uint8Array<ArrayBuffer>> {
  const run = queue.then(() => renderOnce(config));
  queue = run.catch(() => {});
  return run;
}

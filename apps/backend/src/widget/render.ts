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
    import the widget workspace, so the copy is kept in sync by hand. The goal
    meter's class names in FACE_SCRIPT below are mirrored the same way. */
const FACE_SELECTOR = ".quietjar-widget__button, .quietjar-widget__panel";
const MOUNT_TIMEOUT_ATTEMPTS = 30;
const MOUNT_POLL_MS = 100;

/**
 * Pixel density of the capture per image size. Markdown cannot size an image,
 * so the PNG's own dimensions are what a README shows: small is the button at
 * its real size, medium half again as large.
 */
const SIZE_SCALE = { small: 1, medium: 1.5 } as const;

type ImageSize = keyof typeof SIZE_SCALE;

/** The size a config asks for; anything but "medium" renders small. */
function imageSizeOf(config: object): ImageSize {
  const image = (config as { image?: { size?: unknown } }).image;
  return image?.size === "medium" ? "medium" : "small";
}

interface FaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * Whether a goal meter, if there is one, has finished filling. The label is
   * empty until the progress lands, which leaves it zero-height, so measuring
   * before this is true would clip the bar out of the capture.
   */
  settled: boolean;
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

/**
 * A widget with no meter is settled the moment it mounts, so a pill or a
 * goal-less card takes the same single poll it always did. With a meter, the
 * filled label is the signal the progress arrived, and comparing the bar's
 * rendered width against the percentage on its own style attribute waits out
 * the fill transition without needing a DevTools bridge.
 */
const FACE_SCRIPT = `(() => {
  const root = document.querySelector("[data-quietjar-host]")?.shadowRoot;
  const face = root?.querySelector(${JSON.stringify(FACE_SELECTOR)});
  if (!face) return null;
  const rect = face.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  const meter = root.querySelector(".quietjar-widget__meter");
  const label = meter?.querySelector(".quietjar-widget__meter-label");
  const track = meter?.querySelector(".quietjar-widget__meter-track");
  const fill = meter?.querySelector(".quietjar-widget__meter-fill");
  let settled = true;
  if (meter) {
    if (!label || label.textContent === "" || !track || !fill) {
      settled = false;
    } else {
      const width = track.getBoundingClientRect().width;
      const target = width * (parseFloat(fill.style.width) || 0) / 100;
      settled = Math.abs(fill.getBoundingClientRect().width - target) < 0.5;
    }
  }
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, settled };
})()`;

/** The page served by the widget routes; it mounts the widget from the blob. */
function renderPageUrl(origin: string, config: object): string {
  const blob = encodeImageConfig(config);
  return `${origin}/widget/render?c=${encodeURIComponent(blob)}`;
}

async function waitUntilReady(view: Bun.WebView): Promise<FaceRect> {
  let last: FaceRect | null = null;
  for (let attempt = 0; attempt < MOUNT_TIMEOUT_ATTEMPTS; attempt += 1) {
    const rect = (await view.evaluate(FACE_SCRIPT)) as FaceRect | null;
    if (rect?.settled) return rect;
    if (rect) last = rect;
    await Bun.sleep(MOUNT_POLL_MS);
  }
  // A goal whose progress never answers still gets its card captured; a plain
  // card without a bar beats no image at all.
  if (last) return last;
  throw new Error("widget face did not render");
}

async function captureFace(
  view: Bun.WebView,
  face: FaceRect,
  size: ImageSize,
): Promise<Uint8Array<ArrayBuffer>> {
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
        scale: SIZE_SCALE[size],
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
    const face = await waitUntilReady(view);
    return await captureFace(view, face, imageSizeOf(config));
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

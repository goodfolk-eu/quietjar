export interface ImageTarget {
  /** Longest edge allowed, in pixels. */
  maxWidth: number;
  maxHeight: number;
  /** Center-crop to a square first, for images only ever shown in a circle. */
  square: boolean;
}

export const IMAGE_TARGETS = {
  // Shown at up to 112px, so 400 covers a 3x screen.
  avatar: { maxWidth: 400, maxHeight: 400, square: true },
  // Spans a 1024px column at most; 1600 keeps it sharp on 2x screens without
  // shipping a phone camera's full frame to every visitor.
  cover: { maxWidth: 1600, maxHeight: 800, square: false },
} satisfies Record<string, ImageTarget>;

/** Files already this small and within the target size go up untouched. */
const KEEP_ORIGINAL_BYTES = 200 * 1024;
const QUALITY = 0.85;

export interface CropPlan {
  /** Region of the source to read. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Size of the output. */
  width: number;
  height: number;
}

/** Where to read from and how large to draw; never scales up. */
export function planResize(width: number, height: number, target: ImageTarget): CropPlan {
  let sx = 0;
  let sy = 0;
  let sw = width;
  let sh = height;
  if (target.square) {
    const side = Math.min(width, height);
    sx = Math.round((width - side) / 2);
    sy = Math.round((height - side) / 2);
    sw = side;
    sh = side;
  }
  const scale = Math.min(1, target.maxWidth / sw, target.maxHeight / sh);
  return {
    sx,
    sy,
    sw,
    sh,
    width: Math.max(1, Math.round(sw * scale)),
    height: Math.max(1, Math.round(sh * scale)),
  };
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Shrinks an upload to what the hosted page can actually show, so visitors do
 * not download a multi-megabyte photo to fill a small circle. Falls back to the
 * original file whenever the browser cannot decode or encode it; the server
 * still checks size and type either way.
 */
export async function resizeImage(file: File, target: ImageTarget): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const plan = planResize(bitmap.width, bitmap.height, target);
  const unchanged = plan.width === bitmap.width && plan.height === bitmap.height;
  if (unchanged && file.size <= KEEP_ORIGINAL_BYTES) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, plan.sx, plan.sy, plan.sw, plan.sh, 0, 0, plan.width, plan.height);
  bitmap.close();

  // Safari cannot encode WebP and quietly hands back a PNG instead, which is
  // usually larger than the original photo; JPEG is the fallback it can do.
  const webp = await toBlob(canvas, "image/webp");
  let blob = webp;
  if (webp?.type !== "image/webp") {
    // JPEG has no transparency and would turn a transparent logo's background
    // black, so it is flattened onto white first.
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, plan.width, plan.height);
    blob = await toBlob(canvas, "image/jpeg");
  }
  // An image that needed no scaling only swaps formats when that saves bytes.
  if (!blob || (unchanged && blob.size >= file.size)) return file;
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `image.${extension}`, { type: blob.type });
}

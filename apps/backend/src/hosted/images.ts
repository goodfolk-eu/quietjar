import { bunnyS3FromEnv } from "../widget/storage";
import type { ImageKind } from "./store";

/** Mirrors PROTECTED_PREFIX in apps/frontend/deploy.ts, which keeps these across deploys. */
export const HOSTED_IMAGE_PREFIX = "hosted-page-images/";

export const MAX_IMAGE_BYTES: Record<ImageKind, number> = {
  avatar: 2 * 1024 * 1024,
  cover: 5 * 1024 * 1024,
};

export type ImageType = "png" | "jpeg" | "webp";

export const IMAGE_CONTENT_TYPES: Record<ImageType, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  signature.every((byte, index) => bytes[offset + index] === byte);

/**
 * Decided from the bytes, never from the declared type or file name: an SVG
 * or HTML file labelled as a PNG would otherwise be served back as active
 * content from our own origin.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return "webp";
  return null;
}

/** Content-addressed, so a replaced image gets a new URL and caches forever. */
export function imageKeyFor(bytes: Uint8Array, type: ImageType): string {
  const digest = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
  return `${HOSTED_IMAGE_PREFIX}${digest}.${type === "jpeg" ? "jpg" : type}`;
}

/** The type back from a key this module produced, or null for anything else. */
export function imageTypeOfKey(key: string): ImageType | null {
  const match = /^hosted-page-images\/[0-9a-f]{64}\.(png|jpg|webp)$/.exec(key);
  if (!match) return null;
  return match[1] === "jpg" ? "jpeg" : (match[1] as ImageType);
}

export interface HostedImageStore {
  get(key: string): Promise<Uint8Array<ArrayBuffer> | null>;
  put(key: string, data: Uint8Array, type: ImageType): Promise<boolean>;
}

export async function hostedImageStoreFromEnv(
  env: Record<string, string | undefined> = process.env,
): Promise<HostedImageStore | null> {
  const s3 = await bunnyS3FromEnv(env);
  if (!s3) return null;
  return {
    async get(key) {
      try {
        return new Uint8Array(await s3.file(key).arrayBuffer());
      } catch {
        return null;
      }
    },
    async put(key, data, type) {
      try {
        await s3.write(key, data, { type: IMAGE_CONTENT_TYPES[type] });
        return true;
      } catch (err) {
        console.error("[hosted/images] upload failed:", (err as Error).message);
        return false;
      }
    },
  };
}

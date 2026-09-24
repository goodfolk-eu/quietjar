/**
 * Bunny storage for rendered widget images. The S3-compatible endpoint
 * authenticates with the storage zone's password, not the account API key,
 * so the zone password is resolved once through the Core API and cached.
 * A deployment without an API key still serves images (they just re-render).
 */
export interface StoredImage {
  data: Uint8Array<ArrayBuffer>;
  /**
   * When the copy was written, for the images that expire. Null when the
   * bucket did not say, which counts as stale rather than fresh.
   */
  storedAt: number | null;
}

export interface WidgetImageStore {
  /**
   * The stored copy, or null when the key is absent or unreachable. The write
   * time costs an extra HEAD, so it is only asked for by the images that
   * expire; everything else leaves it null and never looks.
   */
  get(key: string, withWriteTime: boolean): Promise<StoredImage | null>;
  /** Best-effort write; a failed store only costs a later re-render. */
  put(key: string, data: Uint8Array<ArrayBuffer>): Promise<void>;
}

/** Mirrors PROTECTED_PREFIX in apps/frontend/deploy.ts: the website deploy
    skips this folder when cleaning stale keys, so the cache survives deploys. */
export const IMAGE_PREFIX = "widget-button-cache/images/";

/** Resolved zone passwords, keyed by storage zone name. */
const passwordCache = new Map<string, { password: string; hostname: string }>();

interface StorageZone {
  Name?: string;
  Password?: string;
  StorageHostname?: string;
  /** The zone's regional S3 endpoint host; StorageHostname is the HTTP API, which S3 calls reject. */
  S3Hostname?: string;
}

async function fetchZone(apiKey: string, bucket: string): Promise<StorageZone | null> {
  const url = `https://api.bunny.net/storagezone?search=${encodeURIComponent(bucket)}&perPage=1000`;
  const response = await fetch(url, { headers: { AccessKey: apiKey, accept: "application/json" } });
  if (!response.ok) return null;
  // Bunny answers a plain array unless the request asks for a page, which
  // wraps the zones in `Items`; both are accepted so neither breaks silently.
  const data = (await response.json()) as StorageZone[] | { Items?: StorageZone[] };
  const zones = Array.isArray(data) ? data : (data.Items ?? []);
  return zones.find((zone) => zone.Name === bucket) ?? null;
}

/**
 * The S3 secret for a storage zone, fetched through the Core API with the
 * account key. Positive lookups are cached for the process lifetime; a
 * failed lookup returns null and retries on the next call.
 */
export async function resolveS3Credentials(
  apiKey: string,
  bucket: string,
): Promise<{ password: string; hostname: string } | null> {
  const cached = passwordCache.get(bucket);
  if (cached) return cached;
  let zone: StorageZone | null = null;
  try {
    zone = await fetchZone(apiKey, bucket);
  } catch {
    return null;
  }
  if (zone?.Name !== bucket || !zone.Password) return null;
  const credentials = {
    password: zone.Password,
    hostname: zone.S3Hostname ?? zone.StorageHostname ?? "storage.bunnycdn.com",
  };
  passwordCache.set(bucket, credentials);
  return credentials;
}

/** The Bunny storage zone as an S3 bucket, or null when it is not configured. */
export async function bunnyS3FromEnv(
  env: Record<string, string | undefined> = process.env,
): Promise<Bun.S3Client | null> {
  const apiKey = env.BUNNY_API_KEY;
  const bucket = env.BUNNY_S3_BUCKET;
  if (!apiKey || !bucket) return null;
  const credentials = await resolveS3Credentials(apiKey, bucket);
  if (!credentials) return null;
  return new Bun.S3Client({
    accessKeyId: bucket,
    secretAccessKey: credentials.password,
    bucket,
    endpoint: env.BUNNY_S3_ENDPOINT ?? `https://${credentials.hostname}`,
  });
}

export async function imageStoreFromEnv(
  env: Record<string, string | undefined> = process.env,
): Promise<WidgetImageStore | null> {
  const s3 = await bunnyS3FromEnv(env);
  if (!s3) return null;
  return {
    async get(key, withWriteTime) {
      try {
        const file = s3.file(key);
        const storedAt = withWriteTime ? await writeTime(file) : null;
        return { data: new Uint8Array(await file.arrayBuffer()), storedAt };
      } catch {
        // A missing key and an unreachable bucket look the same here: both
        // fall back to a fresh render.
        return null;
      }
    },
    async put(key, data) {
      try {
        await s3.write(key, data, { type: "image/png" });
      } catch {
        // The response still goes out; the CDN caches it by its headers.
      }
    },
  };
}

/**
 * The object's write time, from a HEAD. Null when the bucket answers without
 * one, which the caller treats as stale.
 */
async function writeTime(file: Bun.S3File): Promise<number | null> {
  try {
    const at = (await file.stat()).lastModified.getTime();
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

export function imageKeyFor(blob: string): string {
  const digest = new Bun.CryptoHasher("sha256").update(blob).digest("hex");
  return `${IMAGE_PREFIX}${digest}.png`;
}

/** Longest accepted `c` query value; roughly 6KB of widget config JSON. */
export const MAX_BLOB_LENGTH = 8 * 1024;

/**
 * Decodes the base64url config blob from an image URL. The content is only
 * ever passed to the widget's own config resolver inside the render page, so
 * shape validation happens there; here it only has to be JSON we can embed.
 */
export function decodeImageConfig(blob: string): unknown | null {
  if (blob === "" || blob.length > MAX_BLOB_LENGTH) return null;
  try {
    const json = Buffer.from(blob, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** The snippet generator's inverse: widget config JSON to a URL-safe blob. */
export function encodeImageConfig(config: object): string {
  return Buffer.from(JSON.stringify(config), "utf8").toString("base64url");
}

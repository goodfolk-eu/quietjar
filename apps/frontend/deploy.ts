import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_DIR = fileURLToPath(new URL(".", import.meta.url));
const DIST_DIR = join(FRONTEND_DIR, "dist");
const SKIP_BUILD = process.argv.includes("--skip-build");

// Build-time public vars are read from .env so .env.development (loaded by Bun
// while deploy.ts runs) never leaks localhost URLs into a production build.
const PUBLIC_VAR_NAMES = ["PUBLIC_API_URL", "PUBLIC_FRONTEND_URL"];

function productionEnv(): Record<string, string> {
  const dotenv: { [key: string]: string } = {};
  try {
    const text = readFileSync(join(FRONTEND_DIR, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "").trim();
      if (value) dotenv[match[1]] = value;
    }
  } catch {
    // Fall back to inherited env if the file cannot be read.
  }
  const env: Record<string, string> = { ...process.env, NODE_ENV: "production" };
  for (const name of PUBLIC_VAR_NAMES) {
    const value = dotenv[name] ?? process.env[name];
    if (value !== undefined) env[name] = value;
  }
  return env;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".md": "text/markdown",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json",
};

function assertEnv(name: string): string {
  const value = Bun.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env in the frontend folder.`);
  }
  return value;
}

async function runBuild(): Promise<void> {
  if (SKIP_BUILD) {
    console.log("Skipping build (--skip-build). Uploading existing dist/.");
    return;
  }
  console.log("Building frontend with astro...");
  // Spawn the running bun binary so the build works even when bun is not on PATH.
  // Force production mode and the PUBLIC_* values from .env so .env.development
  // never leaks localhost URLs into the build.
  const { exitCode } = Bun.spawnSync([process.execPath, "run", "build"], {
    cwd: FRONTEND_DIR,
    env: productionEnv(),
    stdout: "inherit",
    stderr: "inherit",
  });
  if (exitCode !== 0) {
    throw new Error(`astro build failed with exit code ${exitCode}. Aborting deploy.`);
  }
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function collectUploads(): Promise<Array<{ key: string; path: string }>> {
  const files = await walk(DIST_DIR);
  return files.map((path) => ({
    key: relative(DIST_DIR, path).split(sep).join("/"),
    path,
  }));
}

async function uploadAll(
  s3: Bun.S3Client,
  uploads: Array<{ key: string; path: string }>,
): Promise<void> {
  for (const { key, path } of uploads) {
    const file = Bun.file(path);
    await s3.write(key, file, {
      type: MIME_TYPES[extname(key).toLowerCase()] ?? "application/octet-stream",
    });
    console.log(`  uploaded  ${key}`);
  }
}

async function purgeCache(): Promise<void> {
  const apiKey = Bun.env.BUNNY_API_KEY;
  const pullZoneId = Bun.env.BUNNY_PULL_ZONE_ID;
  if (!apiKey || !pullZoneId) {
    console.warn("Skipping CDN cache purge: BUNNY_API_KEY / BUNNY_PULL_ZONE_ID not set.");
    return;
  }

  console.log("Purging BunnyCDN pull zone cache...");
  const res = await fetch(`https://api.bunny.net/pullzone/${pullZoneId}/purgeCache`, {
    method: "POST",
    headers: { AccessKey: apiKey },
  });
  if (!res.ok) {
    throw new Error(`BunnyCDN cache purge failed: ${res.status} ${res.statusText}`);
  }
}

/** Mirrors IMAGE_PREFIX in apps/backend/src/widget/storage.ts: rendered widget
    images live in the same zone and must survive the deploy's cleanup. */
const PROTECTED_PREFIX = "widget-button-cache/";

async function deleteStale(s3: Bun.S3Client, localKeys: Set<string>): Promise<number> {
  // list returns a Promise resolving to a paged result with a `contents` array.
  // Only real files (size > 0) are deletion candidates; directory markers are skipped.
  const remoteKeys: string[] = [];
  let continuation: string | undefined;
  do {
    const page = await s3.list({ prefix: "", continuationToken: continuation });
    for (const object of page.contents ?? []) {
      if (typeof object.size === "number" && object.size > 0) {
        remoteKeys.push(object.key);
      }
    }
    continuation = page.isTruncated ? page.nextContinuationToken : undefined;
  } while (continuation);

  const stale = remoteKeys.filter(
    (key) => !localKeys.has(key) && !key.startsWith(PROTECTED_PREFIX),
  );
  for (const key of stale) {
    await s3.delete(key);
    console.log(`  deleted   ${key}`);
  }
  return stale.length;
}

async function main(): Promise<void> {
  const endpoint = assertEnv("BUNNY_S3_ENDPOINT");
  const bucket = assertEnv("BUNNY_S3_BUCKET");
  const secret = assertEnv("BUNNY_S3_SECRET");
  // BunnyCDN's S3-compatible API uses the storage zone name as the access key ID.
  const accessKeyId = Bun.env.BUNNY_S3_ACCESS_KEY ?? bucket;

  await runBuild();

  const s3 = new Bun.S3Client({
    accessKeyId,
    secretAccessKey: secret,
    bucket,
    endpoint,
  });

  console.log(
    `Deploying ${DIST_DIR} -> ${endpoint.replace(/^https?:\/\//, "")}/${bucket} (access key: ${accessKeyId})`,
  );

  const uploads = await collectUploads();
  const localKeys = new Set(uploads.map((u) => u.key));

  if (process.argv.includes("--dry-run")) {
    console.log("Dry run. Files that would be uploaded:");
    for (const { key } of uploads) {
      console.log(
        `  ${key}  [${MIME_TYPES[extname(key).toLowerCase()] ?? "application/octet-stream"}]`,
      );
    }
    console.log(`Dry run complete: ${uploads.length} files ready.`);
    return;
  }

  await uploadAll(s3, uploads);
  const deleted = await deleteStale(s3, localKeys);

  console.log(`Deploy complete: ${uploads.length} uploaded, ${deleted} deleted.`);
  await purgeCache();
}

main().catch((err) => {
  console.error("Deploy failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

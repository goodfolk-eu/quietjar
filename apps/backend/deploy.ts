import { readFileSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DOCKERFILE = "apps/backend/Dockerfile";
const IMAGE_NAME = "quietjar";

const SKIP_TYPECHECK = process.argv.includes("--skip-typecheck");
const SKIP_BUILD = process.argv.includes("--skip-build");
const SKIP_LOGIN = process.argv.includes("--skip-login");
const SKIP_REDEPLOY = process.argv.includes("--skip-redeploy");
const DRY_RUN = process.argv.includes("--dry-run");

function assertEnv(name: string): string {
  const value = Bun.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env in the backend folder.`);
  }
  return value;
}

function run(
  label: string,
  args: string[],
  options: { stdin?: Bun.BunFile; cwd?: string } = {},
): void {
  const proc = Bun.spawnSync(args, {
    cwd: options.cwd ?? REPO_ROOT,
    stdin: options.stdin ?? "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  if (proc.exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${proc.exitCode}. Aborting deploy.`);
  }
}

async function typecheck(): Promise<void> {
  if (SKIP_TYPECHECK) {
    console.log("Skipping typecheck (--skip-typecheck).");
    return;
  }
  console.log("Typechecking backend with tsc...");
  run("tsc --noEmit", [process.execPath, "x", "tsc", "--noEmit", "-p", "tsconfig.json"], {
    cwd: BACKEND_DIR,
  });
}

function imageTag(): string {
  const { exitCode, stdout } = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], {
    cwd: REPO_ROOT,
    stdout: "pipe",
  });
  if (exitCode !== 0) {
    throw new Error("Could not determine the current git commit SHA. Aborting deploy.");
  }
  return stdout.toString().trim();
}

function registryEndpoint(): string {
  const username = assertEnv("DOCKERHUB_USERNAME");
  return `docker.io/${username}`;
}

function fullImageName(tag: string): string {
  return `${registryEndpoint()}/${IMAGE_NAME}:${tag}`;
}

async function build(image: string): Promise<void> {
  if (SKIP_BUILD) {
    console.log("Skipping docker build (--skip-build).");
    return;
  }
  console.log(`Building ${IMAGE_NAME} for linux/amd64...`);
  run("docker build", [
    "docker",
    "build",
    "--platform",
    "linux/amd64",
    "-f",
    DOCKERFILE,
    "-t",
    image,
    ".",
  ]);
}

async function login(): Promise<void> {
  if (SKIP_LOGIN) {
    console.log("Skipping docker login (--skip-login).");
    return;
  }
  const username = assertEnv("DOCKERHUB_USERNAME");
  const token = assertEnv("DOCKERHUB_TOKEN");
  console.log(`Logging into ${registryEndpoint()}...`);
  // Pass the token via a file on stdin so it never appears in argv or the shell.
  const secretPath = `${Bun.env.TMPDIR ?? "/tmp"}/quietjar-docker-secret`;
  const secretFile = Bun.file(secretPath);
  await Bun.write(secretFile, token);
  try {
    run(
      "docker login",
      ["docker", "login", registryEndpoint(), "-u", username, "--password-stdin"],
      { stdin: secretFile },
    );
  } finally {
    await unlink(secretPath).catch(() => {});
  }
}

async function push(image: string): Promise<void> {
  console.log(`Pushing ${image}...`);
  run("docker push", ["docker", "push", image]);
}

async function bunnyApi<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const apiKey = Bun.env.BUNNY_API_KEY;
  if (!apiKey) {
    throw new Error("BUNNY_API_KEY is not set. Add it to .env in the backend folder.");
  }
  const res = await fetch(`https://api.bunny.net/mc${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      AccessKey: apiKey,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!res.ok) {
    throw new Error(`Bunny Magic Containers API ${path} failed: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

// Env vars the backend reads at runtime; these are synced to the container from .env.
const MANAGED_ENV_NAMES = [
  "BUNNY_DATABASE_URL",
  "BUNNY_DATABASE_AUTH_TOKEN",
  "BUNNY_DATABASE_READ_ONLY_AUTH_TOKEN",
  "LIBSQL_AUTH_TOKEN",
  "BETTER_AUTH_SECRET",
  "SCALEWAY_ACCESS_KEY",
  "SCALEWAY_SECRET_KEY",
  "SCALEWAY_PROJECT_ID",
  "SCALEWAY_TEM_REGION",
  "SMTP_FROM",
  "PUBLIC_BACKEND_URL",
  "PUBLIC_APP_URL",
  "PUBLIC_FRONTEND_URL",
  "TRUSTED_ORIGINS",
];

function envVarsFromDotenv(): Array<{ name: string; value: string }> {
  // Read production values straight from .env so .env.development (loaded by
  // Bun during `bun deploy`) never overrides them on a prod deploy.
  const file: { [key: string]: string } = {};
  try {
    const text = readFileSync(join(BACKEND_DIR, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "").trim();
      if (value) file[match[1]] = value;
    }
  } catch {
    // Fall back to Bun.env if the file cannot be read.
  }
  return MANAGED_ENV_NAMES.flatMap((name) => {
    const value = file[name] ?? Bun.env[name];
    return value === undefined ? [] : [{ name, value }];
  });
}

type ContainerTemplate = {
  id: string;
  name: string;
  environmentVariables?: { name: string; value: string }[];
};

async function redeployBunny(tag: string): Promise<void> {
  const appId = Bun.env.MC_APP_ID;
  const containerName = Bun.env.MC_CONTAINER_NAME ?? "Container-1";
  if (!appId) {
    throw new Error("MC_APP_ID is not set. Add it to .env in the backend folder.");
  }

  console.log(`Updating Magic Containers container "${containerName}" to tag ${tag}...`);
  const app = await bunnyApi<{ containerTemplates: ContainerTemplate[] }>(`/apps/${appId}`);
  const matches = app.containerTemplates.filter((c) => c.name === containerName);
  if (matches.length === 0) {
    throw new Error(
      `No Magic Containers container named "${containerName}" found in app ${appId}.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(`Found more than one Magic Containers container named "${containerName}".`);
  }

  const container = matches[0];
  const existing = container.environmentVariables ?? [];
  const managed = new Set(MANAGED_ENV_NAMES);
  const kept = existing.filter((e) => !managed.has(e.name));
  const environmentVariables = [...kept, ...envVarsFromDotenv()];

  await bunnyApi(`/apps/${appId}/containers/${container.id}`, {
    method: "PATCH",
    body: { id: container.id, imageTag: tag, environmentVariables },
  });
  console.log(
    `Magic Containers redeploy triggered for ${container.id} (tag ${tag}, ${environmentVariables.length} env vars).`,
  );
}

async function main(): Promise<void> {
  const tag = imageTag();
  const image = fullImageName(tag);

  await typecheck();

  if (DRY_RUN) {
    console.log("Dry run. Would push:");
    console.log(`  ${image}`);
    console.log("Dry run complete.");
    return;
  }

  await build(image);
  await login();
  await push(image);
  console.log(`Deploy complete: ${image} pushed to Docker Hub.`);

  if (SKIP_REDEPLOY) {
    console.log("Skipping Magic Containers redeploy (--skip-redeploy).");
    return;
  }
  await redeployBunny(tag);
}

main().catch((err) => {
  console.error("Deploy failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { serve } from "bun";

const PORT = Number(process.env.PORT ?? 5175);

const clients = new Set<ReadableStreamDefaultController>();

let currentBundle: string | null = null;

function broadcast(eventName: string, data: string): void {
  const frame = `event: ${eventName}\ndata: ${data}\n\n`;
  for (const controller of clients) {
    try {
      controller.enqueue(frame);
    } catch {
      clients.delete(controller);
    }
  }
}

async function build(): Promise<void> {
  try {
    const result = await Bun.build({
      entrypoints: ["src/index.ts"],
      target: "browser",
      format: "iife",
      minify: false,
    });
    currentBundle = await result.outputs[0].text();
    broadcast("reload", "now");
  } catch (err) {
    console.error("Widget build failed:", err);
    broadcast("build-error", JSON.stringify({ message: String(err) }));
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleChange(rebuild: boolean): void {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (rebuild) {
      void build();
    } else {
      broadcast("reload", "now");
    }
  }, 100);
}

watch("src", { recursive: true }, () => scheduleChange(true));
watch("dev-page.html", () => scheduleChange(false));
watch("dev-config.json", () => scheduleChange(false));

async function renderPage(): Promise<Response> {
  try {
    const [html, configRaw] = await Promise.all([
      readFile("dev-page.html", "utf8"),
      readFile("dev-config.json", "utf8"),
    ]);
    const configPretty = JSON.stringify(JSON.parse(configRaw), null, 2);
    const page = html
      .replace("__CONFIG_PRETTY__", configPretty)
      .replace("__CONFIG_RAW__", configRaw.trim());
    return new Response(page, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(`Failed to render test page: ${String(err)}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

serve({
  port: PORT,
  fetch: (req) => {
    const { pathname } = new URL(req.url);

    if (pathname === "/quietjar.js") {
      if (currentBundle === null) {
        return new Response("Widget not built yet. Check the dev server output for errors.", {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
      return new Response(currentBundle, {
        headers: { "content-type": "application/javascript; charset=utf-8" },
      });
    }

    if (pathname === "/__reload") {
      let streamController: ReadableStreamDefaultController | undefined;
      const stream = new ReadableStream({
        start(controller) {
          streamController = controller;
          clients.add(controller);
          controller.enqueue("event: connected\ndata: ok\n\n");
          req.signal.addEventListener("abort", () => clients.delete(controller));
        },
        cancel() {
          if (streamController) {
            clients.delete(streamController);
          }
        },
      });
      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
        },
      });
    }

    if (pathname === "/") {
      return renderPage();
    }

    return new Response("Not found", { status: 404 });
  },
});

void build();

console.log(`QuietJar widget dev server: http://localhost:${PORT}`);

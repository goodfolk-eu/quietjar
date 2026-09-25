// Renders the animation frame by frame in headless Chrome and muxes it with the
// soundtrack.
//   node render.mjs                 full film -> quietjar-explainer.mp4
//   node render.mjs --stills 3,10   PNG stills -> build/stills/
//   node render.mjs --sheet         contact sheet of the whole film -> build/sheet.png
import { spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import puppeteer from "puppeteer-core";

const FPS = 24;
const ROOT = import.meta.dirname;
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? null : (args[i + 1] ?? "");
};

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = createServer((req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!path.startsWith(ROOT) || !existsSync(path) || statSync(path).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--force-color-profile=srgb"] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
page.on("console", (m) => console.log("[page]", m.text()));
page.on("pageerror", (e) => console.error("[page error]", e.message));
await page.goto(`http://localhost:${port}/index.html?render`);
const total = await page.evaluate(() => window.qjReady);

const grab = (t) =>
  page.evaluate(async (tt) => {
    window.qjRenderAt(tt);
    const c = document.getElementById("film");
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, t);

try {
  const stills = flag("--stills");
  if (stills !== null) {
    mkdirSync(join(ROOT, "build/stills"), { recursive: true });
    for (const t of stills.split(",").map(Number)) {
      const file = join(ROOT, `build/stills/t${t.toFixed(2)}.png`);
      writeFileSync(file, Buffer.from(await grab(t), "base64"));
      console.log(file);
    }
  } else if (args.includes("--sheet")) {
    const count = Number(flag("--count") ?? 48);
    const from = Number(flag("--from") ?? 0);
    const to = Number(flag("--to") ?? total);
    const dir = join(ROOT, "build/sheet");
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < count; i++) {
      const t = from + ((to - from) * i) / (count - 1);
      writeFileSync(join(dir, `f${String(i).padStart(3, "0")}.png`), Buffer.from(await grab(t), "base64"));
    }
    const cols = Number(flag("--cols") ?? 6);
    await run("ffmpeg", ["-y", "-v", "error", "-i", join(dir, "f%03d.png"), "-vf", `scale=480:-1,tile=${cols}x${Math.ceil(count / cols)}:padding=6:color=white`, join(ROOT, "build/sheet.png")]);
    console.log("build/sheet.png");
  } else {
    const frames = Math.ceil(total * FPS);
    const out = join(ROOT, flag("--out") ?? "quietjar-explainer.mp4");
    const ff = spawn(
      "ffmpeg",
      [
        "-y", "-v", "error",
        "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
        "-i", join(ROOT, "build/soundtrack.wav"),
        "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-tune", "animation", "-pix_fmt", "yuv420p",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
        "-c:a", "aac", "-b:a", "256k",
        "-shortest", "-movflags", "+faststart",
        out,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const started = Date.now();
    for (let i = 0; i < frames; i++) {
      const png = Buffer.from(await grab(i / FPS), "base64");
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 48 === 0) console.log(`frame ${i}/${frames} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on("close", r));
    console.log(out);
  }
} finally {
  await browser.close();
  server.close();
}

function run(cmd, a) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, a, { stdio: "inherit" });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

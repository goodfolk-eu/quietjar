// Voices every line with Gemini TTS, then times each word with Speech-to-Text,
// because Gemini returns no word timings. Writes build/vo/<voice>/<id>.mp3 and
// <id>.marks.json in the Polly speech-mark format that prep.mjs reads.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const voice = process.argv[2] ?? "Iapetus";
const project = process.env.GOOGLE_CLOUD_PROJECT ?? "teletext-io";
const model = "gemini-2.5-pro-tts";
const style =
  "Read this like a warm, calm narrator of a short product explainer video. Friendly and understated, with natural pauses between sentences.";

const lines = JSON.parse(readFileSync("lines.json", "utf8"));
const out = `build/vo/${voice}`;
mkdirSync(out, { recursive: true });

const token = execFileSync("gcloud", ["auth", "application-default", "print-access-token"], { encoding: "utf8" }).trim();

async function google(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "x-goog-user-project": project, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${url}: ${data.error?.message ?? res.status}`);
  return data;
}

const normalize = (w) => w.replace(/[^\w'-]/g, "").toLowerCase();

async function synthesize(text) {
  const data = await google("https://texttospeech.googleapis.com/v1/text:synthesize", {
    input: { prompt: style, text },
    voice: { languageCode: "en-US", name: voice, modelName: model },
    audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 },
  });
  return Buffer.from(data.audioContent, "base64");
}

async function transcribe(mp3, phrases) {
  const flac = execFileSync("ffmpeg", ["-v", "error", "-i", mp3, "-ac", "1", "-ar", "16000", "-f", "flac", "-"]);
  const data = await google("https://speech.googleapis.com/v1/speech:recognize", {
    config: {
      languageCode: "en-US",
      encoding: "FLAC",
      sampleRateHertz: 16000,
      enableWordTimeOffsets: true,
      model: "latest_long",
      speechContexts: [{ phrases, boost: 15 }],
    },
    audio: { content: flac.toString("base64") },
  });
  return (data.results ?? [])
    .flatMap((r) => r.alternatives[0].words ?? [])
    .map((w) => ({ word: normalize(w.word), time: Math.round(Number.parseFloat(w.startTime) * 1000) }));
}

// Maps each script word to a recognised word by edit-distance alignment, so
// mishearings like "5%" for "five percent" still land on the right time.
function align(script, heard) {
  const n = script.length;
  const m = heard.length;
  const cost = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => i + j));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = cost[i - 1][j - 1] + (script[i - 1] === heard[j - 1].word ? 0 : 1);
      cost[i][j] = Math.min(sub, cost[i - 1][j] + 1, cost[i][j - 1] + 1);
    }
  }
  const times = new Array(n).fill(null);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const same = script[i - 1] === heard[j - 1].word ? 0 : 1;
    if (cost[i][j] === cost[i - 1][j - 1] + same) {
      times[--i] = heard[--j].time;
    } else if (cost[i][j] === cost[i - 1][j] + 1) {
      i--;
    } else {
      j--;
    }
  }
  for (let k = 0; k < n; k++) {
    if (times[k] !== null) continue;
    const prev = times.slice(0, k).findLast((t) => t !== null) ?? 0;
    const next = times.slice(k + 1).find((t) => t !== null) ?? prev;
    times[k] = Math.round((prev + next) / 2);
  }
  return script.map((word, k) => ({ time: times[k], type: "word", value: word }));
}

await Promise.all(
  lines.map(async (line) => {
    const { text } = line;
    const mp3 = `${out}/${line.id}.mp3`;
    writeFileSync(mp3, await synthesize(text));
    const script = text.split(/\s+/).map(normalize).filter(Boolean);
    const heard = await transcribe(mp3, text.split(/[.,:]\s*/).filter(Boolean));
    const marks = align(script, heard);
    writeFileSync(`${out}/${line.id}.marks.json`, `${marks.map((m) => JSON.stringify(m)).join("\n")}\n`);
    console.log(line.id.padEnd(8), heard.map((w) => w.word).join(" "));
  }),
);

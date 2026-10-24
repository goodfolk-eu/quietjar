// Trims each voice line, lays the lines out on a timeline and writes it for the
// animation (build/timeline.js) and the audio mix (build/timeline.json).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const voice = process.argv[2] ?? "Iapetus";
const lines = JSON.parse(readFileSync("lines.json", "utf8"));
const src = `build/vo/${voice}`;
const out = "build/vo-trim";
mkdirSync(out, { recursive: true });

// Seconds of silence before each line starts. Pacing lives here.
const gapBefore = {
  made: 2.75,
  add: 0.5,
  stays: 0.4,
  ignore: 0.4,
  goal: 0.8,
  fills: 0.4,
  methods: 0.6,
  met: 1.3,
  next: 0.8,
  fee: 0.9,
  name: 1.0,
  tag: 0.35,
};
const TAIL = 3.0;
// Speeds up the voice without changing its pitch. Gaps scale along with it.
const TEMPO = 1.15;
const PAD = 0.03;

function probeSilence(file) {
  const res = execFileSync(
    "sh",
    ["-c", `ffmpeg -hide_banner -i "${file}" -af silencedetect=noise=-48dB:d=0.02 -f null - 2>&1`],
    { encoding: "utf8" },
  );
  const starts = [...res.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...res.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const dur = Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], {
      encoding: "utf8",
    }),
  );
  const lead = starts[0] !== undefined && starts[0] < 0.01 ? ends[0] : 0;
  const lastStart = starts.at(-1);
  const trail = lastStart !== undefined && lastStart > lead && (ends.length < starts.length || ends.at(-1) >= dur - 0.02) ? lastStart : dur;
  return { lead, end: trail, dur };
}

let t = 0;
const timeline = [];
for (const line of lines) {
  const mp3 = `${src}/${line.id}.mp3`;
  const { lead, end } = probeSilence(mp3);
  const from = Math.max(0, lead - PAD);
  const to = end + PAD;
  const wav = `${out}/${line.id}.wav`;
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", mp3, "-ss", `${from}`, "-to", `${to}`, "-af", `atempo=${TEMPO}`, "-ar", "48000", "-ac", "1", wav]);
  const duration = (to - from) / TEMPO;

  let words = [];
  const marksFile = `${src}/${line.id}.marks.json`;
  if (existsSync(marksFile)) {
    words = readFileSync(marksFile, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .filter((m) => m.type === "word")
      .map((m) => ({ word: m.value.replace(/[^\w'-]/g, "").toLowerCase(), t: Math.max(0, (m.time / 1000 - from) / TEMPO) }));
  }

  t += (gapBefore[line.id] ?? 0.4) / TEMPO;
  timeline.push({ id: line.id, text: line.text, start: +t.toFixed(3), end: +(t + duration).toFixed(3), words, wav });
  t += duration;
}
const total = +(t + TAIL).toFixed(3);
const data = { voice, total, lines: timeline };
writeFileSync("build/timeline.json", JSON.stringify(data, null, 2));
writeFileSync("build/timeline.js", `window.QJ_TIMELINE = ${JSON.stringify(data)};\n`);
for (const l of timeline) console.log(l.id.padEnd(8), l.start.toFixed(2), l.end.toFixed(2), l.words.map((w) => `${w.word}@${w.t.toFixed(2)}`).join(" "));
console.log("total", total);

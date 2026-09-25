// Builds the soundtrack: an original score and sound effects, synthesised from
// scratch, mixed under the voiceover. Output: build/soundtrack.wav and .mp3.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("./src/score.js");
const T = JSON.parse(readFileSync("build/timeline.json", "utf8"));
const { A, sfx } = globalThis.QJScore.buildScore(T);

const SR = 48000;
const LEN = Math.ceil((T.total + 0.5) * SR);
const TAU = Math.PI * 2;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(7);
const noise = () => rand() * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

class Bus {
  constructor() {
    this.L = new Float32Array(LEN);
    this.R = new Float32Array(LEN);
  }
  add(sig, t, gain = 1, pan = 0) {
    const start = Math.round(t * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < sig.length; i++) {
      const j = start + i;
      if (j < 0 || j >= LEN) continue;
      this.L[j] += sig[i] * gl;
      this.R[j] += sig[i] * gr;
    }
  }
  addStereo(l, r, t, gain = 1) {
    const start = Math.round(t * SR);
    for (let i = 0; i < l.length; i++) {
      const j = start + i;
      if (j < 0 || j >= LEN) continue;
      this.L[j] += l[i] * gain;
      this.R[j] += r[i] * gain;
    }
  }
}

function biquad(type, freq, q = 0.707) {
  const w = (TAU * freq) / SR;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === "lp") [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  else if (type === "hp") [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  else [b0, b1, b2] = [alpha, 0, -alpha];
  const a0 = 1 + alpha;
  const c = [b0 / a0, b1 / a0, b2 / a0, (-2 * cos) / a0, (1 - alpha) / a0];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

function filterArr(sig, type, freq, q) {
  const f = biquad(type, freq, q);
  for (let i = 0; i < sig.length; i++) sig[i] = f(sig[i]);
  return sig;
}

// A band-pass whose centre follows fn(progress), for sweeps.
function sweep(sig, fn, q = 1.2) {
  let f = biquad("bp", fn(0), q);
  for (let i = 0; i < sig.length; i++) {
    if (i % 64 === 0) {
      const next = biquad("bp", fn(i / sig.length), q);
      f = next;
    }
    sig[i] = f(sig[i]);
  }
  return sig;
}

const buf = (sec) => new Float32Array(Math.ceil(sec * SR));

// ---------- instruments ----------

function marimba(freq, vel = 1) {
  const s = buf(1.8);
  const tau = Math.min(0.9, 0.5 * (262 / freq) ** 0.35);
  const partials = [
    [1, 1, tau],
    [3.93, 0.3, tau * 0.22],
    [9.2, 0.08, tau * 0.07],
  ];
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [m, a, d] of partials) v += a * Math.sin(TAU * freq * m * t) * Math.exp(-t / d);
    const att = Math.min(1, t / 0.002);
    s[i] = v * att * vel;
  }
  const click = filterArr(Float32Array.from({ length: 240 }, (_, i) => noise() * Math.exp(-i / 40)), "bp", freq * 4, 1);
  for (let i = 0; i < click.length; i++) s[i] += click[i] * 0.12 * vel;
  return s;
}

function glock(freq, vel = 1) {
  const s = buf(2.6);
  const partials = [
    [1, 1, 1.3],
    [2.76, 0.35, 0.45],
    [5.4, 0.16, 0.18],
    [8.93, 0.06, 0.08],
  ];
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [m, a, d] of partials) v += a * Math.sin(TAU * freq * m * t) * Math.exp(-t / d);
    s[i] = v * Math.min(1, t / 0.001) * vel;
  }
  return s;
}

function pluck(freq, vel = 1, { decay = 0.7, bright = 10, wobble = 0 } = {}) {
  const s = buf(decay * 3);
  let phase = new Array(bright).fill(0);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const detune = wobble ? 2 ** ((wobble * Math.sin(TAU * 0.9 * t + 1)) / 1200) : 1;
    let v = 0;
    for (let n = 1; n <= bright; n++) {
      phase[n - 1] += (TAU * freq * n * detune) / SR;
      const amp = (Math.sin((n * Math.PI) / 5.5) / n) * Math.exp(-t / (decay / n ** 0.8));
      v += amp * Math.sin(phase[n - 1]);
    }
    s[i] = v * Math.min(1, t / 0.004) * vel;
  }
  phase = null;
  return s;
}

function felt(freq, vel = 1, dur = 2.5, wobble = 0) {
  const s = buf(dur + 1.5);
  const voices = [-4, 4];
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const w = wobble ? 2 ** ((wobble * Math.sin(TAU * 0.7 * t)) / 1200) : 1;
    let v = 0;
    for (const cents of voices) {
      const f = freq * 2 ** (cents / 1200) * w;
      for (let n = 1; n <= 6; n++) v += (Math.sin(TAU * f * n * t) / n ** 1.7) * Math.exp(-t / (2.6 / n ** 0.6));
    }
    const release = t > dur ? Math.exp(-(t - dur) / 0.35) : 1;
    s[i] = v * 0.5 * Math.min(1, t / 0.03) * release * vel;
  }
  return s;
}

function woodblock(vel = 1, pitch = 1) {
  const s = buf(0.12);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    s[i] = (Math.sin(TAU * 1150 * pitch * t) * 0.8 + Math.sin(TAU * 2350 * pitch * t) * 0.3) * Math.exp(-t / 0.018) * vel;
  }
  return s;
}

function shaker(vel = 1) {
  const s = Float32Array.from({ length: Math.ceil(0.08 * SR) }, (_, i) => noise() * Math.exp(-i / SR / 0.018) * Math.min(1, i / 90));
  return filterArr(filterArr(s, "hp", 6000), "hp", 6000).map((v) => v * vel);
}

function softKick(vel = 1) {
  const s = buf(0.35);
  let ph = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    ph += (TAU * (48 + 70 * Math.exp(-t / 0.03))) / SR;
    s[i] = Math.sin(ph) * Math.exp(-t / 0.13) * vel;
  }
  return s;
}

// ---------- sound effects ----------

function noiseBurst(sec, env) {
  const s = buf(sec);
  for (let i = 0; i < s.length; i++) s[i] = noise() * env(i / s.length, i / SR);
  return s;
}

const FX = {
  thud(p = 1) {
    const s = buf(0.4);
    let ph = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / SR;
      ph += (TAU * (55 + 90 * Math.exp(-t / 0.025)) * p) / SR;
      s[i] = Math.sin(ph) * Math.exp(-t / 0.07) * 0.9;
    }
    const n = filterArr(noiseBurst(0.12, (_, t) => Math.exp(-t / 0.02)), "lp", 1800 * p);
    for (let i = 0; i < n.length; i++) s[i] += n[i] * 0.8;
    const paper = filterArr(noiseBurst(0.06, (_, t) => Math.exp(-t / 0.012)), "bp", 3200, 0.8);
    for (let i = 0; i < paper.length; i++) s[i] += paper[i] * 0.35;
    return s;
  },
  slap(p = 1) {
    const s = filterArr(noiseBurst(0.09, (_, t) => Math.exp(-t / 0.014)), "bp", 2600 * p, 0.7);
    const low = FX.thud(p * 1.4);
    for (let i = 0; i < s.length; i++) s[i] = s[i] * 1.3 + low[i] * 0.35;
    return s;
  },
  tape(p = 1) {
    const s = buf(0.34);
    const r = rng(Math.floor(p * 1000));
    for (let i = 0; i < s.length; i++) {
      const x = i / s.length;
      const rate = 0.02 + x * 0.12;
      if (r() < rate) s[i] = (r() * 2 - 1) * (0.6 + x * 0.4);
    }
    sweep(s, (x) => (1800 + x * 2600) * p, 1.4);
    const tail = FX.slap(p * 1.2);
    const out = buf(0.5);
    for (let i = 0; i < s.length; i++) out[i] += s[i] * 1.6;
    for (let i = 0; i < tail.length; i++) out[i + Math.round(0.3 * SR)] += tail[i] * 0.5;
    return out;
  },
  pop(p = 1) {
    const s = buf(0.18);
    let ph = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / SR;
      ph += (TAU * (280 + 700 * Math.exp(-t / 0.018)) * p) / SR;
      s[i] = Math.sin(ph) * Math.exp(-t / 0.045) * Math.min(1, t / 0.002);
    }
    return s;
  },
  blip(p = 1) {
    return glock(1568 * p, 0.6);
  },
  click(p = 1) {
    const s = buf(0.06);
    for (const off of [0, 0.011]) {
      const st = Math.round(off * SR);
      for (let i = 0; i < 200; i++) s[st + i] += noise() * Math.exp(-i / 25) * (off ? 0.6 : 1);
      for (let i = 0; i < 400; i++) s[st + i] += Math.sin((TAU * 1900 * p * i) / SR) * Math.exp(-i / 60) * 0.6;
    }
    return filterArr(s, "hp", 900);
  },
  whoosh(p = 1, dur = 0.8) {
    const s = noiseBurst(dur, (x) => Math.sin(Math.PI * x ** 0.7) ** 2);
    return sweep(s, (x) => (350 + 2600 * Math.sin(Math.PI * x ** 0.8)) * p, 0.9).map((v) => v * 1.4);
  },
  pencil(p = 1, dur = 0.8) {
    const r = rng(Math.floor(dur * 999));
    const strokes = [];
    let t = 0;
    while (t < dur) {
      const len = 0.08 + r() * 0.14;
      strokes.push([t, len]);
      t += len + 0.015 + r() * 0.05;
    }
    const s = noiseBurst(dur + 0.1, (_, tt) => {
      for (const [a, l] of strokes) if (tt >= a && tt < a + l) return Math.sin((Math.PI * (tt - a)) / l) * (0.7 + 0.3 * Math.sin(tt * 90));
      return 0;
    });
    return filterArr(filterArr(s, "bp", 4200 * p, 0.9), "hp", 1500);
  },
  scribble(p = 1, dur = 0.5) {
    const s = noiseBurst(dur, (x, t) => (0.55 + 0.45 * Math.sin(TAU * 11 * t)) * Math.min(1, x * 12) * Math.min(1, (1 - x) * 6));
    return filterArr(filterArr(s, "bp", 3000 * p, 0.8), "hp", 1200).map((v) => v * 1.3);
  },
  marker(p = 1, dur = 0.45) {
    const s = noiseBurst(dur, (x) => Math.min(1, x * 10) * Math.min(1, (1 - x) * 5));
    filterArr(s, "bp", 1900 * p, 2.5);
    for (let i = 0; i < s.length; i++) {
      const t = i / SR;
      s[i] = s[i] * 1.5 + Math.sin(TAU * (2100 + 120 * Math.sin(TAU * 7 * t)) * t) * 0.05 * Math.min(1, (dur - t) * 8);
    }
    return s;
  },
  stamp(p = 1) {
    const s = FX.thud(0.8 * p);
    const k = softKick(1);
    for (let i = 0; i < k.length && i < s.length; i++) s[i] = s[i] * 0.9 + k[i] * 0.6;
    return s;
  },
  chime(p = 1) {
    const a = glock(1568 * p, 0.6);
    const b = glock(2093 * p, 0.5);
    const out = buf(2.8);
    for (let i = 0; i < a.length; i++) out[i] += a[i];
    const o = Math.round(0.09 * SR);
    for (let i = 0; i < b.length && i + o < out.length; i++) out[i + o] += b[i];
    return out;
  },
  crumple() {
    const s = buf(0.55);
    const r = rng(99);
    for (let i = 0; i < s.length; i++) {
      const x = i / s.length;
      if (r() < 0.05 * (1 - x) + 0.004) s[i] = (r() * 2 - 1) * (1 - x * 0.7);
    }
    return filterArr(filterArr(s, "hp", 700), "lp", 7000).map((v) => v * 1.6);
  },
  fold(p = 1) {
    const s = noiseBurst(0.3, (x) => Math.sin(Math.PI * x) ** 1.5);
    sweep(s, (x) => (900 + 1500 * x) * p, 0.8);
    const crease = FX.slap(1.3 * p);
    const out = buf(0.45);
    for (let i = 0; i < s.length; i++) out[i] += s[i];
    for (let i = 0; i < crease.length; i++) out[i + Math.round(0.24 * SR)] += crease[i] * 0.45;
    return out;
  },
  slide(p = 1) {
    const s = noiseBurst(0.38, (x) => Math.sin(Math.PI * x ** 0.6) ** 2);
    return filterArr(filterArr(s, "lp", 1400 * p), "hp", 250).map((v) => v * 1.6);
  },
  flip(p = 1) {
    const out = FX.fold(1.3 * p);
    const pp = FX.pop(1.2 * p);
    for (let i = 0; i < pp.length; i++) out[i + Math.round(0.2 * SR)] += pp[i] * 0.7;
    return out;
  },
  tap(p = 1) {
    const s = buf(0.08);
    for (let i = 0; i < s.length; i++) {
      const t = i / SR;
      s[i] = (Math.sin(TAU * 420 * p * t) * 0.7 + noise() * 0.3) * Math.exp(-t / 0.012);
    }
    return filterArr(s, "lp", 3000);
  },
  drift(p = 1) {
    const s = buf(0.7);
    let ph = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / SR;
      ph += (TAU * 900 * p * 2 ** (-t * 2.2)) / SR;
      s[i] = Math.sin(ph) * Math.exp(-t / 0.18) * Math.min(1, t / 0.01) * 0.5;
    }
    return s;
  },
  ticks(_p = 1, dur = 2) {
    const out = buf(dur + 0.2);
    const step = 0.5;
    for (let t = 0, k = 0; t < dur; t += step, k++) {
      const w = woodblock(0.8, k % 2 ? 1.25 : 1);
      const o = Math.round(t * SR);
      for (let i = 0; i < w.length; i++) out[o + i] += w[i];
    }
    return out;
  },
  rewind(_p = 1, dur = 1.2) {
    const out = buf(dur + 0.1);
    let t = 0;
    let k = 0;
    while (t < dur) {
      const x = t / dur;
      const len = 0.09 - 0.06 * x;
      const f0 = 500 + 1400 * x;
      for (let i = 0; i < len * SR; i++) {
        const tt = i / SR;
        const o = Math.round(t * SR) + i;
        if (o >= out.length) break;
        out[o] += Math.sin(TAU * (f0 + (k % 2 ? 300 : -120) * (tt / len)) * tt) * Math.sin((Math.PI * tt) / len) * 0.35;
      }
      t += len;
      k++;
    }
    const swell = noiseBurst(dur, (x) => x ** 2.5);
    filterArr(swell, "hp", 3000);
    for (let i = 0; i < swell.length; i++) out[i] += swell[i] * 0.5;
    return out;
  },
};

// ---------- score ----------

const music = new Bus();
// Section E starts on the "goal" line, four bars in, and runs nine bars to the end card.
const goal = T.lines.find((l) => l.id === "goal").start;
const name = T.lines.find((l) => l.id === "name").start;
const BAR = (name - goal) / 9;
const BEAT = BAR / 4;
const b0 = goal - 4 * BAR;
const at = (bar, beat = 0) => b0 + bar * BAR + beat * BEAT;
console.log(`tempo ${(240 / BAR).toFixed(1)} bpm, bar ${BAR.toFixed(3)}s, music starts ${b0.toFixed(2)}s`);

const CH = {
  C: { bass: 36, notes: [60, 64, 67] },
  "G/B": { bass: 47, notes: [59, 62, 67] },
  Am: { bass: 45, notes: [57, 60, 64] },
  F: { bass: 41, notes: [57, 60, 65] },
  G: { bass: 43, notes: [55, 59, 62] },
  Fmaj7: { bass: 41, notes: [57, 60, 64] },
  Fm: { bass: 41, notes: [56, 60, 65] },
  Db: { bass: 37, notes: [56, 61, 65] },
  Bbm: { bass: 46, notes: [53, 58, 61] },
  Csus: { bass: 36, notes: [55, 60, 65] },
};

const humanize = rng(3);
const hz = () => (humanize() - 0.5) * 0.012;

function arp(bar, chord, { from = 0, to = 4, vel = 0.32, wobble = 0 } = {}) {
  const pattern = [0, 2, 1, 2, 0, 2, 1, 2];
  for (let e = from * 2; e < to * 2; e++) {
    const n = chord.notes[pattern[e]] + (e % 4 === 3 ? 12 : 0);
    const accent = e % 2 === 0 ? 1 : 0.7;
    const sig = wobble ? pluck(mtof(n), 1, { decay: 0.35, bright: 6, wobble }) : marimba(mtof(n), 1);
    music.add(sig, at(bar, e / 2) + hz(), vel * accent * (wobble ? 0.9 : 1), -0.25 + (pattern[e] - 1) * 0.2);
  }
}

function bass(bar, chord, { beats = [0, 2], vel = 0.55, wobble = 0 } = {}) {
  for (const b of beats) music.add(pluck(mtof(chord.bass), 1, { decay: 0.9, bright: 8, wobble }), at(bar, b) + hz(), vel, 0.05);
}

function pad(bar, chord, { vel = 0.12, len = 4, wobble = 0 } = {}) {
  for (const [i, n] of chord.notes.entries()) music.add(felt(mtof(n), 1, len * BEAT, wobble), at(bar) + i * 0.012, vel, -0.4 + i * 0.4);
}

function melody(bar, notes, { inst = "marimba", vel = 0.42, pan = 0.15, octave = 0 } = {}) {
  for (const [beat, m] of notes) {
    const f = mtof(m + octave);
    const sig = inst === "glock" ? glock(f, 1) : marimba(f, 1);
    music.add(sig, at(bar, beat) + hz(), vel, pan);
  }
}

// Intro sparkle as the window lands.
music.add(glock(mtof(84), 1), A.winLand + 0.02, 0.12, 0.3);
music.add(glock(mtof(91), 1), A.winLand + 0.14, 0.08, 0.4);

// A: something people love.
const secA = ["C", "Am"];
const melA = [
  [[2, 67], [2.5, 72], [3, 76]],
  [[0, 76], [1, 74]],
];
secA.forEach((c, i) => {
  const last = i === secA.length - 1;
  arp(i, CH[c], { to: last ? 2 : 4, vel: i === 0 ? 0.22 : 0.28 });
  bass(i, CH[c], { beats: last ? [0] : [0, 2], vel: i === 0 ? 0 : 0.5 });
  melody(i, melA[i], { vel: 0.36 });
});
music.add(glock(mtof(88), 1), A.hearts, 0.14, 0.35);
music.add(glock(mtof(91), 1), A.hearts + 0.18, 0.1, 0.45);

// C: the button turning into wallpaper. Same instruments, detuned and unsure of themselves.
const secC = [
  [1.5, "Fm"],
  [2.5, "Bbm"],
  [3.5, "Csus"],
];
for (const [bar, c] of secC) {
  const last = c === "Csus";
  arp(bar, CH[c], { to: last ? 2 : 4, vel: 0.26, wobble: 22 + (bar - 1.5) * 10 });
  bass(bar, CH[c], { vel: 0.5, wobble: 18, beats: last ? [0] : [0, 2] });
  pad(bar, CH[c], { vel: 0.06, len: last ? 2 : 4, wobble: 30 });
}
// Visitors drifting past the button: a falling line, each note a little further out of tune.
for (let i = 0; i < 7; i++) {
  const t = A.passers + ((A.ghostEnd - A.passers) * i) / 6;
  music.add(pluck(mtof(79 - i * 2), 1, { decay: 0.5, bright: 5, wobble: 25 + i * 6 }), t, 0.12, -0.6 + (i % 5) * 0.3);
}

// E: QuietJar. Warm, a little more motion.
// Bar 4 lands as the goal is met, so it drops to glockenspiel while the button disappears.
const secE = ["C", "G/B", "Am", "F", "Fmaj7", "C", "Am", "F", "G"];
const melE = [
  [[0, 76], [1, 79], [1.5, 81], [2, 79], [3, 76]],
  [[0, 74], [1, 79], [2, 74], [2.5, 72], [3, 71]],
  [[0, 72], [1, 76], [1.5, 79], [2, 81], [3.5, 79]],
  [[0, 77], [1, 76], [2, 72], [3, 74]],
  [[0, 81], [2, 79]],
  [[0, 76], [1, 79], [1.5, 84], [2, 83], [3, 79]],
  [[0, 72], [1, 76], [1.5, 79], [2, 81], [3, 84]],
  [[0, 81], [1, 79], [1.5, 77], [2, 76], [3, 72]],
  [[0, 79], [2, 74], [3, 71]],
];
secE.forEach((c, k) => {
  const bar = 4 + k;
  const quiet = c === "Fmaj7";
  arp(bar, CH[c], { vel: quiet ? 0.17 : 0.27 });
  bass(bar, CH[c], { vel: quiet ? 0.35 : 0.52, beats: quiet ? [0] : [0, 2, 3.5].slice(0, k % 2 ? 3 : 2) });
  pad(bar, CH[c], { vel: quiet ? 0.1 : 0.075 });
  melody(bar, melE[k], { inst: quiet ? "glock" : "marimba", vel: quiet ? 0.2 : 0.36 });
  if (!quiet) melody(bar, melE[k], { inst: "glock", vel: 0.07, octave: 12, pan: 0.4 });
  if (!quiet) {
    for (let s = 0; s < 8; s++) music.add(shaker(s % 2 ? 0.6 : 1), at(bar, s / 2) + hz(), 0.05, 0.5);
    music.add(softKick(1), at(bar, 0), 0.22, 0);
    music.add(softKick(1), at(bar, 2), 0.15, 0);
  }
});

// End: resolve.
const end = 13;
[48, 55, 60, 64, 67, 72, 76].forEach((m, i) => music.add(marimba(mtof(m), 1), at(end, 0) + i * 0.045, 0.32, -0.5 + i * 0.16));
[84, 88, 91, 96].forEach((m, i) => music.add(glock(mtof(m), 1), at(end, 0) + 0.1 + i * 0.09, 0.1, 0.3));
pad(end, CH.C, { vel: 0.12, len: 7 });
music.add(pluck(mtof(36), 1, { decay: 1.4, bright: 8 }), at(end, 0), 0.55, 0);
music.add(glock(mtof(84), 1), A.endHop, 0.12, 0.2);
music.add(glock(mtof(91), 1), A.endHop + 0.16, 0.09, 0.3);

// ---------- effects ----------

const fxBus = new Bus();
for (const cue of sfx) {
  const make = FX[cue.type];
  if (!make) throw new Error(`no sfx ${cue.type}`);
  const sig = make(cue.pitch ?? 1, cue.dur);
  fxBus.add(sig, cue.t, cue.gain * 0.5, (rand() - 0.5) * 0.5);
}

// ---------- voice ----------

function readWav(file) {
  const b = readFileSync(file);
  let off = 12;
  while (off < b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "data") {
      const n = size / 2;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = b.readInt16LE(off + 8 + i * 2) / 32768;
      return out;
    }
    off += 8 + size;
  }
  throw new Error(`no data in ${file}`);
}

const vo = new Bus();
const voEnv = new Float32Array(LEN);
for (const line of T.lines) {
  const sig = readWav(line.wav);
  vo.add(sig, line.start, 1, 0);
  const s = Math.round(line.start * SR);
  for (let i = 0; i < sig.length; i++) voEnv[s + i] = 1;
}

// ---------- reverb ----------

function freeverb(bus, { room = 0.82, damp = 0.35, wet = 0.25 } = {}) {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const alls = [556, 441, 341, 225];
  const fb = room * 0.28 + 0.7;
  const outs = [];
  for (const spread of [0, 23]) {
    const cs = combs.map((d) => ({ b: new Float32Array(Math.round((d + spread) * scale)), i: 0, f: 0 }));
    const as = alls.map((d) => ({ b: new Float32Array(Math.round((d + spread) * scale)), i: 0 }));
    const out = new Float32Array(LEN);
    for (let n = 0; n < LEN; n++) {
      const x = (bus.L[n] + bus.R[n]) * 0.015;
      let y = 0;
      for (const c of cs) {
        const o = c.b[c.i];
        c.f = o * (1 - damp) + c.f * damp;
        c.b[c.i] = x + c.f * fb;
        c.i = (c.i + 1) % c.b.length;
        y += o;
      }
      for (const a of as) {
        const o = a.b[a.i];
        a.b[a.i] = y + o * 0.5;
        a.i = (a.i + 1) % a.b.length;
        y = o - y;
      }
      out[n] = y;
    }
    outs.push(out);
  }
  for (let n = 0; n < LEN; n++) {
    bus.L[n] += outs[0][n] * wet * 3;
    bus.R[n] += outs[1][n] * wet * 3;
  }
}

for (const ch of [fxBus.L, fxBus.R]) {
  filterArr(ch, "lp", 9000);
  filterArr(ch, "lp", 11000);
  filterArr(ch, "hp", 70);
}

freeverb(music, { room: 0.84, damp: 0.4, wet: 0.3 });
freeverb(fxBus, { room: 0.6, damp: 0.5, wet: 0.12 });
freeverb(vo, { room: 0.35, damp: 0.6, wet: 0.035 });

// ---------- mix ----------

const rms = (bus, mask) => {
  let s = 0;
  let n = 0;
  for (let i = 0; i < LEN; i++) {
    if (mask && !mask(i)) continue;
    s += bus.L[i] ** 2 + bus.R[i] ** 2;
    n += 2;
  }
  return Math.sqrt(s / Math.max(1, n));
};

const voRms = rms(vo, (i) => voEnv[i] > 0);
const musicRms = rms(music, (i) => i > b0 * SR);
const musicGain = (voRms / musicRms) * 0.3;
console.log(`vo rms ${voRms.toFixed(4)}, music rms ${musicRms.toFixed(4)}, music gain ${musicGain.toFixed(3)}`);

// Duck the music under the voice with a smoothed envelope.
const duck = new Float32Array(LEN);
{
  const attack = Math.exp(-1 / (0.08 * SR));
  const release = Math.exp(-1 / (0.45 * SR));
  let g = 0;
  const look = Math.round(0.06 * SR);
  for (let i = 0; i < LEN; i++) {
    const target = voEnv[Math.min(LEN - 1, i + look)];
    g = target > g ? target + (g - target) * attack : target + (g - target) * release;
    duck[i] = 1 - 0.38 * g;
  }
}

const L = new Float32Array(LEN);
const R = new Float32Array(LEN);
const fxGain = (voRms / Math.max(1e-6, rms(fxBus, (i) => Math.abs(fxBus.L[i]) > 0.001))) * 0.32;
const fadeOut = (i) => {
  const t = i / SR;
  return t > T.total - 1.2 ? Math.max(0, (T.total - t) / 1.2) : 1;
};
for (let i = 0; i < LEN; i++) {
  const m = musicGain * duck[i];
  const f = fadeOut(i);
  L[i] = (vo.L[i] + music.L[i] * m + fxBus.L[i] * fxGain) * f;
  R[i] = (vo.R[i] + music.R[i] * m + fxBus.R[i] * fxGain) * f;
}

function writeWav(file, l, r) {
  const n = l.length;
  const b = Buffer.alloc(44 + n * 8);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(3, 20);
  b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 8, 28);
  b.writeUInt16LE(8, 32);
  b.writeUInt16LE(32, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 8, 40);
  for (let i = 0; i < n; i++) {
    b.writeFloatLE(l[i], 44 + i * 8);
    b.writeFloatLE(r[i], 48 + i * 8);
  }
  writeFileSync(file, b);
}

writeWav("build/mix-raw.wav", L, R);
if (process.argv.includes("--stems")) {
  writeWav("build/stem-music.wav", music.L.map((v) => v * musicGain), music.R.map((v) => v * musicGain));
  writeWav("build/stem-fx.wav", fxBus.L.map((v) => v * fxGain), fxBus.R.map((v) => v * fxGain));
}

const measure = execFileSync(
  "sh",
  ["-c", "ffmpeg -hide_banner -i build/mix-raw.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | tail -16"],
  { encoding: "utf8" },
);
const m = JSON.parse(measure.slice(measure.lastIndexOf("{"), measure.lastIndexOf("}") + 1));
const ln = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", "build/mix-raw.wav", "-af", ln, "-ar", "48000", "-c:a", "pcm_s16le", "build/soundtrack.wav"]);
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", "build/soundtrack.wav", "-c:a", "libmp3lame", "-b:a", "192k", "build/soundtrack.mp3"]);
console.log(`input ${m.input_i} LUFS, peak ${m.input_tp} dBTP -> build/soundtrack.wav`);

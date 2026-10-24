// Drawing kit for the collage look: cut paper, torn edges, tape, ink lines and
// hand lettering. Everything is procedural and seeded, so every frame renders
// the same way twice.
(function (root) {
  const QJ = (root.QJ = root.QJ || {});
  const W = 1920;
  const H = 1080;
  QJ.W = W;
  QJ.H = H;

  QJ.C = {
    desk: "#e9e1cf",
    paper: "#fbf8f1",
    cream: "#f4eee0",
    card: "#fffdf8",
    ink: "#171a18",
    body: "#565e59",
    green: "#0b6b3a",
    greenDeep: "#08542d",
    pale: "#7fb79a",
    mint: "#dcebdf",
    field: "#14201c",
    fieldMint: "#86c4a3",
    red: "#c9472f",
    mustard: "#e6bf55",
    blue: "#2f5fa8",
    sky: "#a9c7e4",
    grey: "#dcd7cc",
    grey2: "#b9b3a6",
    grey3: "#8d877b",
    pink: "#cc0066",
  };

  // ---------- maths ----------

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    out: (x) => 1 - (1 - x) ** 3,
    in: (x) => x * x * x,
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
    back: (x, s = 1.70158) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
    // A landing: falls in, overshoots a touch, settles.
    settle: (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return 1 - Math.exp(-6 * x) * Math.cos(x * 9);
    },
  };
  Object.assign(QJ, { clamp, lerp, prog, ease });

  function hash(n) {
    let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function rng(seed) {
    let a = Math.floor(seed * 9973) >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noise1(x, seed = 0) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
  }
  Object.assign(QJ, { hash, rng, noise1 });

  // ---------- stop motion ----------

  QJ.ANIM_FPS = 12;
  QJ.BOIL_FPS = 8;
  QJ.snap = (t) => Math.floor(t * QJ.ANIM_FPS + 1e-6) / QJ.ANIM_FPS;
  QJ.frame = { t: 0, boil: 0, zoom: 1 };

  // A small per-piece wobble that changes a few times a second, like pieces
  // nudged between exposures.
  QJ.jitter = (seed, amt = 1) => {
    const b = QJ.frame.boil;
    return {
      x: (hash(seed * 13.1 + b * 7.7) - 0.5) * 1.6 * amt,
      y: (hash(seed * 17.3 + b * 5.3) - 0.5) * 1.6 * amt,
      r: (hash(seed * 11.9 + b * 3.1) - 0.5) * 0.005 * amt,
    };
  };

  // ---------- textures ----------

  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  QJ.makeCanvas = makeCanvas;

  function grainCanvas(size, seed, { amp = 26, fibers = 260, dark = 0.5, mottle = true } = {}) {
    const c = makeCanvas(size, size);
    const g = c.getContext("2d");
    const img = g.createImageData(size, size);
    const r = rng(seed);
    for (let i = 0; i < size * size; i++) {
      const v = 128 + (r() - 0.5) * amp + (r() - 0.5) * amp * 0.4;
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // Soft mottling.
    for (let i = 0; i < (mottle ? 40 : 0); i++) {
      const x = r() * size;
      const y = r() * size;
      const rad = 20 + r() * 90;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const shade = r() < 0.5 ? "0,0,0" : "255,255,255";
      grd.addColorStop(0, `rgba(${shade},${0.05 + r() * 0.05})`);
      grd.addColorStop(1, `rgba(${shade},0)`);
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // Fibres.
    g.lineCap = "round";
    for (let i = 0; i < fibers; i++) {
      let x = r() * size;
      let y = r() * size;
      let a = r() * Math.PI * 2;
      const len = 6 + r() * 26;
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < len; s += 3) {
        a += (r() - 0.5) * 0.6;
        x += Math.cos(a) * 3;
        y += Math.sin(a) * 3;
        g.lineTo(x, y);
      }
      g.strokeStyle = r() < dark ? `rgba(60,50,35,${0.12 + r() * 0.15})` : `rgba(255,255,255,${0.2 + r() * 0.25})`;
      g.lineWidth = 0.6 + r() * 0.8;
      g.stroke();
    }
    return c;
  }

  QJ.init = function init(ctx) {
    QJ.grain = ctx.createPattern(grainCanvas(512, 3), "repeat");
    QJ.grainFine = ctx.createPattern(grainCanvas(256, 9, { amp: 34, fibers: 60 }), "repeat");
    QJ.desk = buildDesk();
  };

  // The desk: a big sheet of warm paper, larger than the frame so the camera can
  // travel over it.
  QJ.DESK = { x: -700, y: -700, w: 5400, h: 2600 };
  function buildDesk() {
    const { w, h } = QJ.DESK;
    const s = 0.5;
    const c = makeCanvas(w * s, h * s);
    const g = c.getContext("2d");
    g.scale(s, s);
    g.fillStyle = QJ.C.desk;
    g.fillRect(0, 0, w, h);
    const r = rng(42);
    for (let i = 0; i < 160; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 120 + r() * 520;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const shade = r() < 0.55 ? "120,95,60" : "255,250,240";
      grd.addColorStop(0, `rgba(${shade},${0.035 + r() * 0.04})`);
      grd.addColorStop(1, `rgba(${shade},0)`);
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.globalCompositeOperation = "soft-light";
    g.globalAlpha = 0.9;
    g.fillStyle = g.createPattern(grainCanvas(1024, 5, { amp: 40, fibers: 2400, dark: 0.55, mottle: false }), "repeat");
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.5;
    g.fillStyle = g.createPattern(grainCanvas(384, 11, { amp: 50, fibers: 160, mottle: false }), "repeat");
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    // Faint pencil marks and old tape ghosts left on the desk.
    for (let i = 0; i < 26; i++) {
      const x = r() * w;
      const y = r() * h;
      g.save();
      g.translate(x, y);
      g.rotate((r() - 0.5) * 1.2);
      if (r() < 0.5) {
        g.fillStyle = `rgba(230,200,120,${0.08 + r() * 0.06})`;
        g.fillRect(-60, -16, 120 + r() * 60, 32);
      } else {
        g.strokeStyle = "rgba(70,60,50,0.07)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, 0);
        for (let k = 0; k < 6; k++) g.lineTo(k * 30 + r() * 10, (r() - 0.5) * 14);
        g.stroke();
      }
      g.restore();
    }
    return c;
  }

  QJ.drawDesk = function drawDesk(ctx) {
    const d = QJ.DESK;
    ctx.drawImage(QJ.desk, d.x, d.y, d.w, d.h);
  };

  // ---------- shapes ----------

  const shapeCache = new Map();
  QJ.cached = (key, make) => {
    let v = shapeCache.get(key);
    if (!v) {
      v = make();
      shapeCache.set(key, v);
    }
    return v;
  };

  function roundedRectPts(w, h, r) {
    const pts = [];
    const corner = (cx, cy, a0) => {
      for (let i = 0; i <= 6; i++) {
        const a = a0 + (i / 6) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    if (r <= 0) return [[0, 0], [w, 0], [w, h], [0, h]];
    corner(w - r, r, -Math.PI / 2);
    corner(w - r, h - r, 0);
    corner(r, h - r, Math.PI / 2);
    corner(r, r, Math.PI);
    return pts;
  }

  // Scissor cuts: long straight runs with small changes of direction.
  function scissor(pts, seed, jag = 1.3, seg = [36, 110]) {
    const r = rng(seed);
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const nx = -(y1 - y0) / (len || 1);
      const ny = (x1 - x0) / (len || 1);
      out.push([x0 + nx * (r() - 0.5) * jag, y0 + ny * (r() - 0.5) * jag]);
      let d = seg[0] + r() * (seg[1] - seg[0]);
      while (d < len - seg[0] * 0.5) {
        const f = d / len;
        const off = (r() - 0.5) * jag * 2;
        out.push([x0 + (x1 - x0) * f + nx * off, y0 + (y1 - y0) * f + ny * off]);
        d += seg[0] + r() * (seg[1] - seg[0]);
      }
    }
    return out;
  }

  // Fibrous torn edge between two points.
  function torn(x0, y0, x1, y1, seed, amp = 7) {
    const r = rng(seed);
    let pts = [[x0, y0], [x1, y1]];
    let a = amp;
    for (let level = 0; level < 6; level++) {
      const next = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const nx = -(by - ay) / len;
        const ny = (bx - ax) / len;
        const off = (r() - 0.5) * a * 2;
        next.push([(ax + bx) / 2 + nx * off, (ay + by) / 2 + ny * off], pts[i + 1]);
      }
      pts = next;
      a *= 0.55;
    }
    return pts;
  }

  const toPath = (pts) => {
    const p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    return p;
  };

  // A cut-paper rectangle, origin top-left. tornSides: "t", "b", "l", "r".
  QJ.cutRect = (w, h, seed, { r = 0, jag = 1.3, tornSides = "", tear = 8 } = {}) =>
    QJ.cached(`rect:${w}:${h}:${seed}:${r}:${jag}:${tornSides}:${tear}`, () => {
      if (!tornSides) return toPath(scissor(roundedRectPts(w, h, r), seed, jag));
      const side = (s, a, b, i) => (tornSides.includes(s) ? torn(a[0], a[1], b[0], b[1], seed + i, tear) : scissor([a, b], seed + i, jag).concat([b]));
      const pts = [
        ...side("t", [0, 0], [w, 0], 1),
        ...side("r", [w, 0], [w, h], 2),
        ...side("b", [w, h], [0, h], 3),
        ...side("l", [0, h], [0, 0], 4),
      ];
      return toPath(pts);
    });

  QJ.cutCircle = (rad, seed, { jag = 1.2, n = 0 } = {}) =>
    QJ.cached(`circ:${rad}:${seed}:${jag}`, () => {
      const r = rng(seed);
      const count = n || Math.max(10, Math.round(rad / 7));
      const pts = [];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const rr = rad + (r() - 0.5) * jag * 2;
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      return toPath(pts);
    });

  QJ.cutPoly = (pts, seed, jag = 1.2) => QJ.cached(`poly:${seed}:${pts.flat().join(",")}`, () => toPath(scissor(pts, seed, jag, [20, 60])));

  // A thought cloud made of overlapping bumps.
  QJ.cloud = (w, h, seed) =>
    QJ.cached(`cloud:${w}:${h}:${seed}`, () => {
      const r = rng(seed);
      const pts = [];
      const bumps = 11;
      for (let i = 0; i < bumps; i++) {
        const a0 = (i / bumps) * Math.PI * 2;
        const a1 = ((i + 1) / bumps) * Math.PI * 2;
        const bulge = 0.16 + r() * 0.08;
        for (let k = 0; k <= 8; k++) {
          const f = k / 8;
          const a = lerp(a0, a1, f);
          const b = 1 + Math.sin(f * Math.PI) * bulge;
          pts.push([w / 2 + Math.cos(a) * (w / 2) * b * 0.9, h / 2 + Math.sin(a) * (h / 2) * b * 0.84]);
        }
      }
      return toPath(scissor(pts, seed, 1, [14, 30]));
    });

  // ---------- paper ----------

  // Draws a paper piece: shadow, colour, grain, and a pale cut edge.
  QJ.paper = (ctx, path, { fill = QJ.C.paper, lift = 0, texture = 0.6, edge = 0.5, alpha = 1, shadow = 1 } = {}) => {
    const z = QJ.frame.zoom;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (shadow > 0) {
      ctx.shadowColor = `rgba(58,42,22,${(0.26 - lift * 0.08) * shadow})`;
      ctx.shadowBlur = (7 + lift * 34) * z;
      ctx.shadowOffsetX = (2.5 + lift * 16) * z;
      ctx.shadowOffsetY = (4.5 + lift * 26) * z;
    }
    ctx.fillStyle = fill;
    ctx.fill(path);
    ctx.shadowColor = "transparent";
    if (texture > 0) {
      ctx.save();
      ctx.clip(path);
      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha *= texture;
      ctx.fillStyle = QJ.grain;
      ctx.fillRect(-2000, -2000, 4000, 4000);
      ctx.restore();
    }
    if (edge > 0) {
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = `rgba(255,255,255,${edge})`;
      ctx.stroke(path);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = `rgba(40,30,20,${edge * 0.25})`;
      ctx.stroke(path);
    }
    ctx.restore();
  };

  // Places a piece with its own wobble. Origin at (x, y); draw() works in local space.
  QJ.piece = (ctx, { x = 0, y = 0, rot = 0, scale = 1, sx = 1, sy = 1, seed = 1, wobble = 1, alpha = 1 }, draw) => {
    if (alpha <= 0.001 || scale <= 0.001) return;
    const j = QJ.jitter(seed, wobble);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x + j.x, y + j.y);
    ctx.rotate(rot + j.r);
    ctx.scale(scale * sx, scale * sy);
    draw(ctx);
    ctx.restore();
  };

  // Washi tape with torn ends.
  QJ.tape = (ctx, x, y, w, rot, { color = "rgba(233,207,140,0.78)", seed = 1, h = 40, alpha = 1 } = {}) => {
    const path = QJ.cached(`tape:${w}:${h}:${seed}`, () => {
      const r = rng(seed);
      const pts = [];
      const zig = (x0, top) => {
        const n = 6;
        for (let i = 0; i <= n; i++) {
          const yy = top ? (i / n) * h : h - (i / n) * h;
          pts.push([x0 + (r() - 0.5) * 7, yy - h / 2]);
        }
      };
      zig(-w / 2, true);
      zig(w / 2, false);
      return toPath(pts);
    });
    QJ.piece(ctx, { x, y, rot, seed, alpha }, (c) => {
      c.save();
      const base = c.globalAlpha;
      c.shadowColor = "rgba(60,45,20,0.12)";
      c.shadowBlur = 3 * QJ.frame.zoom;
      c.shadowOffsetY = 1.5 * QJ.frame.zoom;
      c.fillStyle = color;
      c.fill(path);
      c.shadowColor = "transparent";
      c.clip(path);
      c.globalCompositeOperation = "soft-light";
      c.globalAlpha = base * 0.8;
      c.fillStyle = QJ.grainFine;
      c.fillRect(-w, -h, w * 2, h * 2);
      c.globalCompositeOperation = "source-over";
      c.globalAlpha = base * 0.18;
      c.fillStyle = "#fff";
      c.fillRect(-w / 2, -h / 2 + 5, w, 5);
      c.restore();
    });
  };

  // ---------- ink ----------

  function resample(pts, step) {
    const out = [pts[0]];
    let carry = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const len = Math.hypot(bx - ax, by - ay);
      let d = step - carry;
      while (d <= len) {
        out.push([ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len]);
        d += step;
      }
      carry = len - (d - step);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  QJ.resample = resample;

  QJ.spline = (ctrl, perSeg = 16) => {
    const out = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)];
      const p1 = ctrl[i];
      const p2 = ctrl[i + 1];
      const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      for (let k = 0; k < perSeg; k++) {
        const t = k / perSeg;
        const t2 = t * t;
        const t3 = t2 * t;
        out.push(
          [0, 1].map(
            (d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3),
          ),
        );
      }
    }
    out.push(ctrl[ctrl.length - 1]);
    return out;
  };

  // A pen line: wobbly, slightly uneven, redrawn a little differently each boil frame.
  QJ.ink = (ctx, pts, { w = 4, color = QJ.C.ink, seed = 1, reveal = 1, rough = 1.1, alpha = 1, dash = null, taper = true } = {}) => {
    if (reveal <= 0 || pts.length < 2) return;
    const b = QJ.frame.boil % 3;
    const rs = resample(pts, 5);
    const n = Math.max(2, Math.floor(rs.length * clamp(reveal)));
    const passes = [
      [1, 1, 0],
      [0.45, 0.4, 1],
    ];
    ctx.save();
    const base = ctx.globalAlpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    if (dash) ctx.setLineDash(dash);
    for (const [wf, af, k] of passes) {
      ctx.globalAlpha = base * alpha * af;
      ctx.lineWidth = w * wf;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const [x, y] = rs[i];
        const s = seed * 3.7 + b * 19.1 + k * 7.3;
        const px = x + noise1(i * 0.21, s) * rough + noise1(i * 1.3, s + 2) * rough * 0.3;
        const py = y + noise1(i * 0.21, s + 5) * rough + noise1(i * 1.3, s + 9) * rough * 0.3;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    if (taper && !dash) {
      ctx.globalAlpha = base * alpha * 0.9;
      ctx.fillStyle = color;
      const [ex, ey] = rs[n - 1];
      ctx.beginPath();
      ctx.arc(ex, ey, w * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  QJ.circlePts = (cx, cy, rx, ry, { turns = 1.08, start = -2.2, seed = 1 } = {}) => {
    const pts = [];
    const n = Math.round(60 * turns);
    for (let i = 0; i <= n; i++) {
      const a = start + (i / n) * Math.PI * 2 * turns;
      const wob = 1 + noise1(i * 0.15, seed) * 0.03;
      pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
    }
    return pts;
  };

  // A zig-zag scribble that crosses something out.
  QJ.scribblePts = (x, y, w, h, seed, rows = 7) => {
    const r = rng(seed);
    const pts = [];
    for (let i = 0; i <= rows; i++) {
      const yy = y + (i / rows) * h + (r() - 0.5) * 6;
      pts.push(i % 2 ? [x + w + (r() - 0.5) * 16, yy] : [x + (r() - 0.5) * 16, yy]);
    }
    return pts;
  };

  QJ.arrowHead = (ctx, pts, { w = 4, color = QJ.C.ink, size = 22, seed = 1, alpha = 1 } = {}) => {
    const [x1, y1] = pts[pts.length - 1];
    const [x0, y0] = pts[Math.max(0, pts.length - 4)];
    const a = Math.atan2(y1 - y0, x1 - x0);
    for (const s of [-1, 1]) {
      const b = a + Math.PI + s * 0.5;
      QJ.ink(ctx, [[x1, y1], [x1 + Math.cos(b) * size, y1 + Math.sin(b) * size]], { w, color, seed: seed + s, alpha, taper: false });
    }
  };

  // ---------- lettering ----------

  QJ.FONT = {
    hand: "Caveat",
    marker: "Kalam",
    sans: "'Schibsted Grotesk'",
    mono: "'JetBrains Mono'",
  };

  QJ.text = (ctx, str, x, y, { size = 40, font = QJ.FONT.sans, weight = 600, color = QJ.C.ink, align = "left", base = "alphabetic", reveal = 1, alpha = 1, spacing = 0 } = {}) => {
    if (reveal <= 0 || alpha <= 0) return 0;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    if (spacing) ctx.letterSpacing = `${spacing}px`;
    ctx.fillStyle = color;
    const w = ctx.measureText(str).width;
    if (reveal < 1) {
      const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
      ctx.beginPath();
      ctx.rect(x0 - 10, y - size * 1.5, (w + 20) * reveal, size * 2.4);
      ctx.clip();
    }
    ctx.fillText(str, x, y);
    ctx.restore();
    return w;
  };

  // Handwriting: slight baseline wobble per boil frame, written on left to right.
  QJ.hand = (ctx, str, x, y, opts = {}) => {
    const j = QJ.jitter((opts.seed ?? 3) + 50, 0.8);
    return QJ.text(ctx, str, x + j.x, y + j.y, { font: QJ.FONT.hand, weight: 600, ...opts });
  };

  QJ.measure = (ctx, str, size, font = QJ.FONT.sans, weight = 600) => {
    ctx.save();
    ctx.font = `${weight} ${size}px ${font}`;
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  };

  // ---------- small props ----------

  QJ.cursor = (ctx, x, y, { scale = 1, rot = -0.05, seed = 1, alpha = 1, fill = QJ.C.card, press = 0, lift = 0.1 } = {}) => {
    const path = QJ.cached("cursor", () => {
      const pts = [
        [0, 0],
        [0, 46],
        [11, 35],
        [19, 53],
        [27, 49],
        [19, 32],
        [34, 32],
      ].map(([a, b]) => [a * 1.05, b * 1.05]);
      return toPath(scissor(pts, 77, 0.8, [8, 16]));
    });
    QJ.piece(ctx, { x, y, rot, scale: scale * (1 - press * 0.14), seed, alpha }, (c) => {
      QJ.paper(c, path, { fill, lift: lift + press * -0.1, edge: 0 });
      c.lineWidth = 3.2;
      c.lineJoin = "round";
      c.strokeStyle = QJ.C.ink;
      c.stroke(path);
    });
  };

  QJ.heartPath = () =>
    QJ.cached("heart", () => {
      const pts = [];
      for (let i = 0; i < 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        const hx = 16 * Math.sin(t) ** 3;
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        pts.push([hx, hy]);
      }
      return toPath(pts);
    });

  QJ.ripple = (ctx, x, y, p, { color = QJ.C.ink, seed = 1 } = {}) => {
    if (p <= 0 || p >= 1) return;
    for (let k = 0; k < 2; k++) {
      const q = clamp(p * 1.3 - k * 0.25);
      if (q <= 0 || q >= 1) continue;
      const rad = 18 + ease.out(q) * 54;
      QJ.ink(ctx, QJ.circlePts(x, y, rad, rad, { turns: 1, seed: seed + k }), { w: 3.5 * (1 - q), color, alpha: 1 - q, seed: seed + k, taper: false });
    }
  };

  // Rubber stamp: ink letters inside a rounded border, with speckled coverage.
  QJ.stamp = (ctx, str, x, y, { size = 64, color = QJ.C.green, rot = -0.14, p = 1, seed = 5 } = {}) => {
    if (p <= 0) return;
    const scale = lerp(1.35, 1, ease.out(clamp(p * 3)));
    const alpha = clamp(p * 4);
    QJ.piece(ctx, { x, y, rot, scale, seed, alpha }, (c) => {
      const w = QJ.measure(c, str, size, QJ.FONT.sans, 800) + size * 0.9;
      const h = size * 1.55;
      const off = QJ.makeStampCanvas(str, size, color, w, h, seed);
      c.globalAlpha *= 0.9;
      c.drawImage(off, -w / 2 - 10, -h / 2 - 10);
    });
  };
  const stampCache = new Map();
  QJ.makeStampCanvas = (str, size, color, w, h, seed) => {
    const key = `${str}:${size}:${color}:${seed}`;
    if (stampCache.has(key)) return stampCache.get(key);
    const c = makeCanvas(Math.ceil(w + 20), Math.ceil(h + 20));
    const g = c.getContext("2d");
    g.translate(10, 10);
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = size * 0.09;
    const r = h * 0.28;
    g.beginPath();
    g.roundRect(3, 3, w - 6, h - 6, r);
    g.stroke();
    g.font = `800 ${size}px ${QJ.FONT.sans}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.letterSpacing = `${size * 0.04}px`;
    g.fillText(str.toUpperCase(), w / 2, h / 2 + size * 0.05);
    // Knock out speckles so it reads as inked rubber.
    const rr = rng(seed);
    g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < (w * h) / 55; i++) {
      g.globalAlpha = 0.3 + rr() * 0.7;
      g.beginPath();
      g.arc(rr() * w, rr() * h, 0.6 + rr() * 1.8, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 6; i++) {
      g.globalAlpha = 0.25;
      g.fillRect(rr() * w, rr() * h, 20 + rr() * 60, 2 + rr() * 3);
    }
    stampCache.set(key, c);
    return c;
  };
})(typeof window !== "undefined" ? window : globalThis);

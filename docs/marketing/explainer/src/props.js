// The cast: the pig from the logo, the wordmark, and the paper mock-ups of
// websites, cards and the QuietJar button.
(function (root) {
  const QJ = root.QJ;
  const { C, FONT, clamp, lerp, ease } = QJ;

  // ---------- the pig ----------

  const PIG = {
    tail: [[68.5, 64.2], [45.3, 56.9], [70.6, 81.1]],
    legFront: [[78.4, 121.2], [99.5, 121.2], [87.5, 157.1], [77.2, 157.1]],
    legBack: [[140.5, 121.2], [161.6, 121.2], [162.8, 157.1], [152.5, 157.1]],
    snout: [[193.3, 80.6], [174.3, 79], [163.5, 131.5], [193.3, 104.6]],
    earSide: [[140.7, 33.3], [194.2, 55.8], [138.1, 73.2]],
    earTop: [[116.5, 44.9], [147.6, 17.8], [138.9, 91]],
    notch: [[113.6, 44.3], [127.1, 35.7], [122.6, 57.5]],
    body: { x: 59.9, y: 47.4, w: 120.3, h: 93.2, r: 44.6 },
    eye: [160.5, 80.5, 7.2],
  };
  const PAD = 30;
  const RES = 2.2;
  let pigCanvas;

  const polyPath = (pts) => {
    const p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    return p;
  };
  const rotAround = (g, px, py, a) => {
    g.translate(px, py);
    g.rotate(a);
    g.translate(-px, -py);
  };

  function renderPig(pose, color, cutColor) {
    if (!pigCanvas) pigCanvas = QJ.makeCanvas(Math.ceil((240 + PAD * 2) * RES), Math.ceil((180 + PAD * 2) * RES));
    const g = pigCanvas.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, pigCanvas.width, pigCanvas.height);
    g.setTransform(RES, 0, 0, RES, PAD * RES, PAD * RES);
    g.fillStyle = color;
    g.strokeStyle = color;
    g.lineWidth = 6;
    g.lineJoin = "round";
    const part = (pts, pivot, angle) => {
      g.save();
      if (pivot) rotAround(g, pivot[0], pivot[1], angle);
      const p = polyPath(pts);
      g.fill(p);
      g.stroke(p);
      g.restore();
    };
    part(PIG.tail, [70, 72], pose.tail ?? 0);
    part(PIG.legFront, [89, 121], pose.legFront ?? 0);
    part(PIG.legBack, [151, 121], pose.legBack ?? 0);
    part(PIG.snout, [174, 100], 0);
    part(PIG.earSide, [140, 55], pose.earSide ?? 0);
    const b = PIG.body;
    const bodyPath = new Path2D();
    bodyPath.roundRect(b.x, b.y, b.w, b.h, b.r);
    g.fill(bodyPath);
    g.stroke(bodyPath);
    const earAngle = pose.ear ?? 0;
    part(PIG.earTop, [128, 60], earAngle);

    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = 0.16;
    g.fillStyle = QJ.grain;
    g.fillRect(0, 0, pigCanvas.width, pigCanvas.height);
    g.restore();

    // The ear is set into the body by a thin cut, like the logo.
    g.save();
    g.globalCompositeOperation = cutColor ? "source-over" : "destination-out";
    g.fillStyle = cutColor || "#000";
    g.strokeStyle = cutColor || "#000";
    const clip = new Path2D();
    clip.roundRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6, b.r + 3);
    g.clip(clip);
    rotAround(g, 128, 60, earAngle);
    const ear = polyPath(PIG.earTop);
    g.lineWidth = 6;
    g.fill(ear);
    g.stroke(ear);
    g.restore();
    g.save();
    g.globalCompositeOperation = cutColor ? "source-over" : "destination-out";
    g.fillStyle = cutColor || "#000";
    rotAround(g, 128, 60, earAngle);
    g.fill(polyPath(PIG.notch));
    g.restore();

    // Eye, or a closed eye when blinking.
    g.save();
    g.globalCompositeOperation = cutColor ? "source-over" : "destination-out";
    g.fillStyle = cutColor || "#000";
    const [ex, ey, er] = PIG.eye;
    const blink = pose.blink ?? 0;
    g.beginPath();
    g.ellipse(ex, ey, er, Math.max(1.4, er * (1 - blink)), 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    return pigCanvas;
  }

  // Draws the pig with its feet centred on (x, y). size is its height in px.
  QJ.pig = (ctx, x, y, size, { pose = {}, color = "#1c201e", cut = null, rot = 0, sx = 1, sy = 1, seed = 21, alpha = 1, lift = 0, shadow = 1 } = {}) => {
    if (alpha <= 0 || size <= 0) return;
    const img = renderPig(pose, color, cut);
    const s = size / 140;
    QJ.piece(ctx, { x, y, rot, seed, alpha }, (c) => {
      c.scale(sx, sy);
      c.scale(s, s);
      const z = QJ.frame.zoom;
      if (shadow) {
        c.shadowColor = `rgba(58,42,22,${0.28 - lift * 0.08})`;
        c.shadowBlur = (7 + lift * 30) * z;
        c.shadowOffsetX = (2.5 + lift * 14) * z;
        c.shadowOffsetY = (4.5 + lift * 22) * z;
      }
      c.drawImage(img, -120 - PAD, -157 - PAD, img.width / RES, img.height / RES);
    });
  };

  // ---------- the wordmark ----------

  const WORD = {
    green:
      "M24.90 1.20L24.90 1.20Q18.30 1.20 13.20-2.05Q8.10-5.30 5.20-11.10Q2.30-16.90 2.30-24.40L2.30-24.40Q2.30-32 5.15-37.80Q8-43.60 13.10-46.85Q18.200-50.10 24.80-50.10L24.80-50.10Q31.20-50.10 36-47L36-47Q38-45.70 39.60-44L39.60-44L41-48.90L51.90-48.90L51.90 19L37.30 19L37.30-2.50Q36.70-2.10 36.20-1.80L36.20-1.80Q31.40 1.20 24.90 1.20ZM27.60-12.50L27.60-12.50Q32.10-12.50 35.05-15.85Q38-19.20 38-24.50L38-24.50Q38-29.70 35.05-33.05Q32.10-36.40 27.60-36.40Q23.10-36.40 20.15-33.05Q17.20-29.70 17.20-24.40L17.20-24.40Q17.20-19.20 20.15-15.850Q23.10-12.50 27.60-12.50ZM76.30 1.20L76.30 1.20Q70.90 1.20 67.55-0.40Q64.20-2 62.35-4.85Q60.50-7.70 59.85-11.35Q59.20-15 59.20-19.10L59.20-19.10L59.20-48.90L73.80-48.90L73.80-19.90Q73.80-15.80 75.50-14.45Q77.20-13.10 79.70-13.10L79.70-13.10Q81.90-13.10 84-13.85Q86.10-14.60 88.10-16.10L88.10-16.10Q89.20-16.80 90.10-17.80L90.10-17.80L90.10-48.90L104.80-48.90L104.80 0L93.90 0L92.20-5.60Q91.30-4.80 90.40-4.10L90.40-4.10Q87.20-1.60 83.70-0.20Q80.20 1.20 76.30 1.20ZM127.50-48.90L127.50 0L112.90 0L112.90-48.90L127.50-48.90ZM111.60-64.30L111.60-64.30Q111.60-68.20 113.95-70.60Q116.30-73 120.20-73L120.20-73Q124.10-73 126.45-70.60Q128.80-68.20 128.80-64.30L128.80-64.30Q128.80-60.50 126.45-58.15Q124.10-55.80 120.20-55.80L120.20-55.80Q116.30-55.80 113.95-58.15Q111.60-60.50 111.60-64.30ZM157.20 0.90L157.20 0.90Q149.90 0.90 144.35-2.20Q138.80-5.30 135.75-11Q132.70-16.70 132.70-24.40L132.70-24.40Q132.70-32 135.75-37.80Q138.80-43.60 144.35-46.85Q149.90-50.10 157.20-50.10L157.20-50.10Q164.70-50.10 170.20-46.70Q175.70-43.30 178.70-37.55Q181.70-31.80 181.70-24.60L181.70-24.60Q181.70-23.30 181.60-22.10Q181.50-20.90 181.40-20.20L181.40-20.20L146.20-20.20Q146.60-16 149.30-13.50L149.30-13.50Q152.40-10.40 158-10.40L158-10.40Q162.70-10.40 165.45-12.30Q168.20-14.20 170.10-17L170.10-17L180-11.50Q176.80-5.60 171-2.35Q165.20 0.90 157.20 0.90ZM146.40-30.60L146.40-30.60L168-30.60Q167.30-33.30 165.80-35.30L165.80-35.30Q163-38.80 157.30-38.80L157.30-38.80Q152.20-38.80 149.20-35.70L149.20-35.70Q147.10-33.60 146.40-30.60ZM208.40 0.80L208.40 0.80Q200.30 0.80 195.65-3.20Q191-7.20 191-16.30L191-16.30L191-35.50L183.40-35.50L183.40-48.90L190.80-48.90L193.80-60.70L205.60-60.70L205.60-48.90L216.50-48.90L216.50-35.50L205.60-35.50L205.60-19.50Q205.60-16.10 207.20-14.65Q208.80-13.20 211.40-13.20L211.40-13.20Q212.90-13.20 214.25-13.45Q215.60-13.70 216.50-14L216.50-14L216.50-0.30Q214.80 0.20 212.85 0.50Q210.90 0.80 208.40 0.80Z",
    ink: "M224 19.50L224 19.50Q221.40 19.50 219.75 19.10Q218.10 18.70 217.60 18.50L217.60 18.50L217.60 6.20Q218.10 6.30 218.85 6.40Q219.60 6.50 220.70 6.50L220.70 6.50Q222.60 6.50 223.60 5.15Q224.60 3.80 224.60 1.50L224.60 1.50L224.60-48.90L239.20-48.90L239.20 4.10Q239.20 8.10 237.65 11.65Q236.10 15.20 232.75 17.35Q229.40 19.50 224 19.50ZM223.20-64.30L223.20-64.30Q223.20-68.20 225.55-70.60Q227.90-73 231.80-73L231.80-73Q235.70-73 238.05-70.60Q240.40-68.20 240.40-64.30L240.40-64.30Q240.40-60.50 238.05-58.15Q235.70-55.80 231.80-55.80L231.80-55.80Q227.90-55.80 225.55-58.15Q223.20-60.50 223.20-64.30ZM262.10 1.30L262.10 1.30Q256.80 1.30 252.75-0.75Q248.70-2.80 246.50-6.50Q244.30-10.20 244.30-15.10L244.30-15.10Q244.30-20.30 246.70-23.95Q249.10-27.60 253.15-29.60Q257.20-31.60 262.20-31.60L262.20-31.60Q269.30-31.60 273.70-28.50L273.70-28.50L273.70-31.30Q273.70-34 271.80-36Q269.90-38 265.70-38L265.70-38Q263-38 259.50-37.35Q256-36.70 252.30-34.90L252.30-34.90L248-45.30Q252.40-47.50 257.45-48.80Q262.50-50.10 267.80-50.10L267.80-50.10Q274.60-50.10 279.20-47.70Q283.80-45.30 286.05-40.90Q288.30-36.50 288.30-30.70L288.30-30.70L288.30 0L276.40 0L275.40-3.40Q274.70-2.70 273.90-2.10L273.90-2.10Q269.40 1.30 262.10 1.30ZM266.60-9.10L266.60-9.10Q269.90-9.10 271.85-10.80Q273.80-12.50 273.80-15.10L273.80-15.10Q273.80-17.90 271.85-19.50Q269.90-21.10 266.60-21.10Q263.30-21.10 261.40-19.50Q259.50-17.90 259.50-15.10L259.50-15.10Q259.50-12.50 261.40-10.80Q263.30-9.10 266.60-9.10ZM295.50-48.90L306.30-48.90L307.70-43.80Q308.20-44.30 308.80-44.80L308.80-44.80Q311-47 314.05-48.55Q317.10-50.10 320.30-50.10L320.30-50.10Q321.90-50.10 323.20-49.90Q324.50-49.70 325.30-49.20L325.30-49.20L325.30-35.90L322-35.90Q315.60-35.90 312-33.90L312-33.90Q310.90-33.30 310.10-32.50L310.10-32.50L310.10 0L295.50 0L295.50-48.90Z",
  };

  // Splits the wordmark into glyphs (holes stay with their letter) so each one
  // can be dropped in on its own.
  QJ.glyphs = () =>
    QJ.cached("glyphs", () => {
      const out = [];
      for (const [tone, d] of Object.entries(WORD)) {
        const subs = d.split(/(?=M)/);
        let group = null;
        for (const sub of subs) {
          const nums = (sub.match(/-?\d*\.?\d+/g) || []).map(Number);
          const xs = nums.filter((_, i) => i % 2 === 0);
          const ys = nums.filter((_, i) => i % 2 === 1);
          const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
          const inside = group && box.x0 >= group.box.x0 - 1 && box.x1 <= group.box.x1 + 1 && box.y0 >= group.box.y0 - 1 && box.y1 <= group.box.y1 + 1;
          if (inside) group.d += sub;
          else {
            group = { tone, d: sub, box };
            out.push(group);
          }
        }
      }
      for (const g of out) {
        g.path = new Path2D(g.d);
        g.cx = (g.box.x0 + g.box.x1) / 2;
        g.cy = (g.box.y0 + g.box.y1) / 2;
        g.dot = g.box.y1 < -50;
      }
      return out;
    });

  // ---------- mock-ups ----------

  const card = (ctx, w, h, seed, opts = {}) => QJ.paper(ctx, QJ.cutRect(w, h, seed, { r: opts.r ?? 14, jag: 1.1 }), opts);
  QJ.card = card;

  const pencilLines = (ctx, x, y, w, rows, gap, seed, color = "rgba(23,26,24,0.22)", reveal = 1) => {
    for (let i = 0; i < rows; i++) {
      const lw = i === rows - 1 ? w * 0.6 : w * (0.86 + QJ.hash(seed + i) * 0.14);
      QJ.ink(ctx, [[x, y + i * gap], [x + lw, y + i * gap + (QJ.hash(seed * 3 + i) - 0.5) * 3]], {
        w: 7,
        color,
        seed: seed + i,
        rough: 0.8,
        taper: false,
        reveal: clamp(reveal * rows - i),
      });
    }
  };
  QJ.pencilLines = pencilLines;

  QJ.windowFrame = (ctx, w, h, { url = "yourname.com", lift = 0 } = {}) => {
    card(ctx, w, h, 101, { fill: C.card, lift, r: 18 });
    const bar = QJ.cutRect(w, 64, 102, { r: 18, jag: 0.8 });
    ctx.save();
    ctx.clip(QJ.cutRect(w, h, 101, { r: 18, jag: 1.1 }));
    QJ.paper(ctx, bar, { fill: C.cream, shadow: 0, texture: 0.7, edge: 0 });
    ctx.restore();
    QJ.ink(ctx, [[0, 64], [w, 64]], { w: 2, color: "rgba(23,26,24,0.18)", seed: 5, rough: 0.6, taper: false });
    ["#e2a79b", "#e8cd8a", "#a9cfae"].forEach((col, i) => {
      ctx.save();
      ctx.translate(36 + i * 30, 32);
      QJ.paper(ctx, QJ.cutCircle(9, 110 + i), { fill: col, shadow: 0, edge: 0.3 });
      ctx.restore();
    });
    const pillW = 360;
    ctx.save();
    ctx.translate(w / 2 - pillW / 2, 15);
    QJ.paper(ctx, QJ.cutRect(pillW, 34, 120, { r: 17, jag: 0.7 }), { fill: C.card, shadow: 0, edge: 0 });
    ctx.restore();
    QJ.text(ctx, url, w / 2, 39, { size: 19, weight: 500, color: C.body, align: "center" });
  };

  QJ.blogCard = (ctx, { reveal = 1 } = {}) => {
    const w = 440;
    const h = 430;
    card(ctx, w, h, 201, { fill: C.card, r: 10 });
    ctx.save();
    ctx.translate(20, 20);
    ctx.save();
    ctx.clip(QJ.cutRect(400, 190, 202, { r: 6 }));
    QJ.paper(ctx, QJ.cutRect(400, 190, 202, { r: 6 }), { fill: "#cfe0ea", shadow: 0, edge: 0 });
    ctx.translate(292, 62);
    QJ.paper(ctx, QJ.cutCircle(30, 203), { fill: C.mustard, shadow: 0.6, edge: 0.4 });
    ctx.translate(-292, -62);
    ctx.translate(-10, 96);
    QJ.paper(ctx, QJ.cutRect(430, 120, 204, { tornSides: "t", tear: 18 }), { fill: C.pale, shadow: 0.7 });
    ctx.translate(-20, 36);
    QJ.paper(ctx, QJ.cutRect(470, 120, 205, { tornSides: "t", tear: 14 }), { fill: C.green, shadow: 0.7 });
    ctx.restore();
    ctx.restore();
    QJ.text(ctx, "SEP 2026", 22, 248, { size: 15, weight: 600, color: C.green, spacing: 1.5 });
    QJ.text(ctx, "Notes on slow software", 22, 286, { size: 30, weight: 700, color: C.ink });
    pencilLines(ctx, 24, 322, 380, 4, 26, 206, "rgba(23,26,24,0.2)", reveal);
  };

  QJ.podcastCard = (ctx, t) => {
    const w = 400;
    const h = 230;
    card(ctx, w, h, 301, { fill: C.field, r: 14, edge: 0.3 });
    ctx.save();
    ctx.translate(22, 22);
    QJ.paper(ctx, QJ.cutRect(120, 120, 302, { r: 10 }), { fill: C.mint, shadow: 0.5, edge: 0.3 });
    ctx.translate(60, 60);
    QJ.paper(ctx, QJ.cutCircle(38, 303), { fill: C.green, shadow: 0.4 });
    QJ.paper(ctx, QJ.cutCircle(9, 304), { fill: C.mint, shadow: 0 });
    ctx.restore();
    QJ.text(ctx, "Small Talk", 162, 58, { size: 28, weight: 700, color: "#f4efe4" });
    QJ.text(ctx, "Episode 42", 162, 88, { size: 19, weight: 500, color: C.fieldMint });
    for (let i = 0; i < 26; i++) {
      const x = 162 + i * 8.4;
      const amp = 8 + Math.abs(QJ.noise1(i * 0.7 + Math.floor(t * 8) * 0.9, 7)) * 26;
      QJ.ink(ctx, [[x, 124 - amp / 2], [x, 124 + amp / 2]], { w: 4, color: C.fieldMint, seed: i, rough: 0.4, taper: false });
    }
    ctx.save();
    ctx.translate(60, 188);
    QJ.paper(ctx, QJ.cutCircle(22, 305), { fill: "#f4efe4", shadow: 0.4 });
    ctx.fillStyle = C.field;
    ctx.beginPath();
    ctx.moveTo(-6, -10);
    ctx.lineTo(11, 0);
    ctx.lineTo(-6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    QJ.ink(ctx, [[102, 188], [370, 188]], { w: 4, color: "rgba(244,239,228,0.25)", seed: 9, taper: false });
    QJ.ink(ctx, [[102, 188], [190, 188]], { w: 4, color: C.fieldMint, seed: 10, taper: false });
  };

  QJ.toolCard = (ctx, { done = 0, typed = 1 } = {}) => {
    const w = 480;
    const h = 190;
    card(ctx, w, h, 401, { fill: "#1b2521", r: 12, edge: 0.3 });
    [0, 1, 2].forEach((i) => {
      ctx.fillStyle = "rgba(244,239,228,0.25)";
      ctx.beginPath();
      ctx.arc(26 + i * 20, 24, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    const cmd = "npx tidy-photos ~/Pictures";
    const n = Math.floor(cmd.length * clamp(typed));
    QJ.text(ctx, "$", 26, 80, { size: 24, font: FONT.mono, weight: 600, color: C.fieldMint });
    QJ.text(ctx, cmd.slice(0, n), 52, 80, { size: 24, font: FONT.mono, weight: 500, color: "#f4efe4" });
    if (done > 0) {
      QJ.text(ctx, "Sorted 1,204 photos in 3s", 26, 124, { size: 22, font: FONT.mono, weight: 500, color: C.fieldMint, reveal: done });
      QJ.text(ctx, "Saved you an afternoon.", 26, 158, { size: 22, font: FONT.mono, weight: 500, color: "rgba(244,239,228,0.55)", reveal: clamp(done * 1.6 - 0.6) });
    }
  };

  // goal: { p: how far the progress bar has grown in, fill: 0..1 }
  QJ.supportButton = (ctx, { w = 380, h = 88, label = "Support this site", lift = 0, press = 0, goal = null } = {}) => {
    const g = goal ? goal.p : 0;
    const hh = h + g * 34;
    ctx.save();
    ctx.scale(1 - press * 0.05, 1 - press * 0.05);
    const path = QJ.cutRect(w, Math.round(hh), 901, { r: h / 2, jag: 1 });
    ctx.translate(-w / 2, -hh / 2);
    QJ.paper(ctx, path, { fill: C.green, lift, edge: 0.35 });
    ctx.restore();
    ctx.save();
    ctx.scale(1 - press * 0.05, 1 - press * 0.05);
    QJ.pig(ctx, -w / 2 + 58, h * 0.25 - g * 14, h * 0.46, { color: "#fbf8f1", shadow: 0, seed: 902, cut: null });
    QJ.text(ctx, label, -w / 2 + 98, 11 - g * 14, { size: 30, weight: 700, color: "#fbf8f1" });
    if (g > 0) {
      const tw = w - 98 - 40;
      const th = 14;
      ctx.save();
      ctx.globalAlpha = clamp(g * 2);
      ctx.translate(-w / 2 + 98, 22);
      const track = QJ.cutRect(tw, th, 903, { r: th / 2, jag: 0.5 });
      ctx.fillStyle = "rgba(251,248,241,0.28)";
      ctx.fill(track);
      ctx.save();
      ctx.clip(track);
      ctx.fillStyle = "#fbf8f1";
      ctx.fillRect(0, 0, tw * clamp(goal.fill) * g, th);
      ctx.restore();
      ctx.restore();
    }
    ctx.restore();
  };

  // The open QuietJar panel. state: { apple, ideal, card, selected, pressed }
  QJ.panel = (ctx, s) => {
    const w = 540;
    const h = 460;
    card(ctx, w, h, 1001, { fill: C.card, r: 24, lift: s.lift ?? 0 });
    QJ.text(ctx, "Support this site", 34, 62, { size: 32, weight: 700, color: C.ink });
    ctx.save();
    ctx.translate(w - 56, 50);
    QJ.paper(ctx, QJ.cutCircle(20, 1002), { fill: "#f1eee6", shadow: 0, edge: 0 });
    QJ.ink(ctx, [[-7, -3], [0, 4], [7, -3]], { w: 3, color: C.body, seed: 3, taper: false });
    ctx.restore();
    const thanks = s.thanks ?? 0;
    const bodyA = clamp(1 - thanks * 2.5);
    if (bodyA > 0) {
      ctx.save();
      ctx.globalAlpha *= bodyA;
      const amounts = ["€3", "€5", "€10", "Other"];
      const chipW = [104, 104, 104, 136];
      let x = 34;
      amounts.forEach((a, i) => {
        const sel = s.selected === i;
        ctx.save();
        ctx.translate(x, 96);
        const path = QJ.cutRect(chipW[i], 66, 1010 + i, { r: 14, jag: 0.8 });
        QJ.paper(ctx, path, { fill: sel ? "#eef6f0" : "#ffffff", shadow: 0.35, edge: 0 });
        ctx.lineWidth = sel ? 3.5 : 2;
        ctx.strokeStyle = sel ? C.green : "rgba(23,26,24,0.18)";
        ctx.stroke(path);
        QJ.text(ctx, a, chipW[i] / 2, 43, { size: 26, weight: 700, color: sel ? C.green : C.ink, align: "center" });
        ctx.restore();
        x += chipW[i] + 12;
      });
      QJ.text(ctx, "Pay with", 34, 208, { size: 19, weight: 600, color: C.body });
      const methods = [
        { key: "apple", w: 170, fill: "#111", label: "Apple Pay", color: "#fff" },
        { key: "ideal", w: 140, fill: "#fff", label: "iDEAL", color: C.pink },
        { key: "card", w: 146, fill: "#fff", label: "Card", color: C.ink, icon: true },
      ];
      x = 34;
      methods.forEach((m, i) => {
        const p = s[m.key] ?? 0;
        if (p > 0) {
          const sc = lerp(0.3, 1, ease.back(clamp(p * 2.2), 2.4));
          const pressed = s.pressed === m.key;
          ctx.save();
          ctx.translate(x + m.w / 2, 258);
          ctx.scale(sc * (pressed ? 0.94 : 1), sc * (pressed ? 0.94 : 1));
          ctx.rotate((1 - clamp(p * 2)) * (i % 2 ? 0.2 : -0.2));
          ctx.translate(-m.w / 2, -32);
          const path = QJ.cutRect(m.w, 64, 1020 + i, { r: 14, jag: 0.8 });
          QJ.paper(ctx, path, { fill: m.fill, shadow: 0.5, edge: m.fill === "#111" ? 0.2 : 0 });
          if (m.fill === "#fff") {
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(23,26,24,0.18)";
            ctx.stroke(path);
          }
          let tx = m.w / 2;
          if (m.icon) {
            ctx.save();
            ctx.translate(26, 20);
            QJ.paper(ctx, QJ.cutRect(36, 25, 1030, { r: 4, jag: 0.5 }), { fill: C.sky, shadow: 0, edge: 0 });
            ctx.fillStyle = "rgba(23,26,24,0.55)";
            ctx.fillRect(0, 6, 36, 5);
            ctx.restore();
            tx += 20;
          }
          QJ.text(ctx, m.label, tx, 42, { size: 24, weight: 700, color: m.color, align: "center" });
          ctx.restore();
        }
        x += m.w + 12;
      });
      ctx.save();
      ctx.translate(34, 322);
      const btn = QJ.cutRect(w - 68, 74, 1040, { r: 37, jag: 1 });
      QJ.paper(ctx, btn, { fill: C.green, shadow: 0.5, edge: 0.3 });
      ctx.restore();
      QJ.text(ctx, s.selected === 1 ? "Support with €5" : "Support", w / 2, 370, { size: 28, weight: 700, color: "#fbf8f1", align: "center" });
      ctx.restore();
    }
    if (thanks > 0) {
      const pop = ease.back(clamp(thanks * 1.4), 2.6);
      ctx.save();
      ctx.translate(w / 2, 188);
      ctx.scale(pop, pop);
      QJ.paper(ctx, QJ.cutCircle(58, 1050), { fill: C.green, lift: 0.1 });
      QJ.ink(ctx, [[-24, 2], [-7, 20], [26, -18]], { w: 11, color: "#fbf8f1", seed: 1051, reveal: clamp(thanks * 2 - 0.5), rough: 0.8 });
      ctx.restore();
      const ta = clamp(thanks * 2 - 0.6);
      QJ.text(ctx, "Thank you.", w / 2, 316, { size: 46, weight: 800, color: C.ink, align: "center", alpha: ta, spacing: -1 });
      QJ.text(ctx, "Your support keeps this site going.", w / 2, 360, { size: 22, weight: 400, color: C.body, align: "center", alpha: ta });
    }
    QJ.text(ctx, "Powered by QuietJar", w / 2, 432, { size: 16, weight: 500, color: C.grey3, align: "center" });
  };

  QJ.goalCard = (ctx, { fill = 0, strips = [], title = "Hosting for the year", target = 500 } = {}) => {
    const w = 780;
    const h = 380;
    card(ctx, w, h, 1101, { fill: C.card, r: 22 });
    QJ.text(ctx, "GOAL", 48, 72, { size: 20, weight: 700, color: C.green, spacing: 2 });
    QJ.text(ctx, title, 48, 128, { size: 50, weight: 800, color: C.ink, spacing: -1 });
    const raised = Math.round(target * fill);
    QJ.text(ctx, `€${raised} of €${target} raised`, 48, 186, { size: 26, weight: 600, color: C.body });
    const tx = 48;
    const ty = 224;
    const tw = w - 96;
    const th = 64;
    ctx.save();
    ctx.translate(tx, ty);
    const track = QJ.cutRect(tw, th, 1102, { r: th / 2, jag: 1 });
    QJ.paper(ctx, track, { fill: "#f2eee5", shadow: 0, edge: 0 });
    ctx.save();
    ctx.clip(track);
    strips.forEach((st, i) => {
      if (st <= 0) return;
      const sw = tw / 6 + 26;
      const sx = (tw / 6) * i + sw / 2 - 14;
      const drop = 1 - ease.out(clamp(st * 3));
      const cols = ["rgba(11,107,58,0.92)", "rgba(20,120,68,0.9)", "rgba(11,107,58,0.95)"];
      QJ.tape(ctx, sx, th / 2 - drop * 40, sw, (QJ.hash(i + 3) - 0.5) * 0.08 - drop * 0.3, { color: cols[i % 3], seed: 1110 + i, h: th + 14, alpha: clamp(st * 5) });
    });
    ctx.restore();
    QJ.ink(ctx, QJ.cached("trackOutline", () => {
      const pts = [];
      const r = th / 2;
      for (let i = 0; i <= 80; i++) {
        const a = (i / 80) * Math.PI * 2;
        const side = Math.cos(a) >= 0 ? tw - r : r;
        pts.push([side + Math.cos(a) * r, r + Math.sin(a) * r]);
      }
      return pts;
    }), { w: 3, color: C.ink, seed: 1103, taper: false, rough: 0.8 });
    ctx.restore();
    const pct = Math.round(fill * 100);
    QJ.text(ctx, `${pct}%`, w - 48, 186, { size: 26, weight: 700, color: C.green, align: "right" });
    QJ.text(ctx, "Every bit goes to the server bill.", 48, 342, { size: 22, weight: 400, color: C.body });
  };

  // A shipping-tag shape with a punched hole.
  QJ.tag = (ctx, w, h, seed, fill) => {
    const path = QJ.cached(`tag:${w}:${h}:${seed}`, () => {
      const n = 46;
      const p = new Path2D(QJ.cutPoly([[n, 0], [w, 0], [w, h], [n, h], [0, h - n], [0, n]], seed, 1.3));
      return p;
    });
    QJ.paper(ctx, path, { fill });
    ctx.save();
    ctx.translate(46, h / 2);
    QJ.paper(ctx, QJ.cutCircle(19, seed + 1), { fill: "#f7f1e2", shadow: 0.6, edge: 0.3 });
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = QJ.C.desk;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(60,40,20,0.35)";
    ctx.beginPath();
    ctx.arc(0, 1.5, 8, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.restore();
  };
})(typeof window !== "undefined" ? window : globalThis);

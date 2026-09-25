// The film. render(ctx, t) draws one frame at time t (seconds). All timing
// comes from the cue sheet in score.js.
(function (root) {
  const QJ = root.QJ;
  const { C, W, H, clamp, lerp, prog, ease } = QJ;
  let A;

  QJ.setup = (timeline) => {
    A = root.QJScore.buildScore(timeline).A;
    QJ.A = A;
  };

  // ---------- layout (world coordinates) ----------

  const WIN = { x: 370, y: 210, w: 1180, h: 700 };
  const wx = (lx) => WIN.x + lx;
  const wy = (ly) => WIN.y + ly;

  const BUTTON = { lx: 950, ly: 616 };
  const PANEL = { lx: 600, ly: 94, w: 540, h: 460 };
  const GOAL = { lx: 490, ly: 300 };

  // ---------- motion helpers ----------

  // A piece dropped onto the desk: falls in from above the lens, lands, settles.
  const drop = (t, t0, dur = 0.38) => {
    const p = prog(t, t0, t0 + dur);
    const e = ease.in(p);
    return { on: t >= t0, p, scale: lerp(1.28, 1, e), lift: 1 - e, alpha: clamp(p * 6) };
  };
  // A quick slap-down.
  const slap = (t, t0, dur = 0.2) => {
    const p = prog(t, t0, t0 + dur);
    return { on: t >= t0, p, scale: lerp(1.22, 1, ease.out(p)), lift: 1 - ease.out(p), alpha: clamp(p * 5) };
  };
  const away = (t, t0, dur = 0.55) => ease.in(prog(t, t0, t0 + dur));

  function keyframes(t, frames) {
    if (t <= frames[0][0]) return { x: frames[0][1], y: frames[0][2] };
    for (let i = 0; i < frames.length - 1; i++) {
      const [t0, x0, y0] = frames[i];
      const [t1, x1, y1, e = "inOut"] = frames[i + 1];
      if (t <= t1) {
        const p = ease[e](prog(t, t0, t1));
        return { x: lerp(x0, x1, p), y: lerp(y0, y1, p) };
      }
    }
    const last = frames[frames.length - 1];
    return { x: last[1], y: last[2] };
  }

  // ---------- camera ----------

  function camera(t) {
    let z = lerp(1, 1.03, ease.inOut(prog(t, 0, A.pigPop)));
    const lean = ease.inOut(prog(t, A.ghostStart, A.ghostEnd)) * (1 - ease.inOut(prog(t, A.revive, A.revive + 0.8)));
    let x = 960 + lean * 180;
    let y = 540 + lean * 120;
    z *= 1 + lean * 0.1;
    const push = ease.inOut(prog(t, A.unfold - 0.25, A.unfold + 0.55)) * (1 - ease.inOut(prog(t, A.fold, A.fold + 0.7)));
    x += push * 200;
    y += push * 10;
    z *= 1 + push * 0.12;
    const endPush = ease.inOut(prog(t, A.logo, A.total));
    z *= 1 + endPush * 0.04;
    return { x, y, z, r: 0 };
  }

  // ---------- the site window ----------

  function windowPose(t) {
    const p = prog(t, A.winDrop, A.winLand);
    const e = ease.in(p);
    const settleT = t - A.winLand;
    let rot = lerp(-0.09, -0.008, e);
    if (settleT > 0) rot += Math.sin(settleT * 22) * Math.exp(-settleT * 9) * 0.01;
    const out = away(t, A.clearPage, 0.6);
    return {
      on: t >= A.winDrop && out < 1,
      x: WIN.x + WIN.w / 2 - out * 500,
      y: WIN.y + WIN.h / 2 - (1 - e) * 1100 - out * 1400,
      rot: rot - out * 0.3,
      lift: Math.max(1 - e, out),
      scale: lerp(1.08, 1, e) + out * 0.06,
    };
  }

  function drawWindow(ctx, t) {
    const pose = windowPose(t);
    if (!pose.on) return;
    QJ.piece(ctx, { x: pose.x, y: pose.y, rot: pose.rot, scale: pose.scale, seed: 1 }, (c) => {
      c.translate(-WIN.w / 2, -WIN.h / 2);
      QJ.windowFrame(c, WIN.w, WIN.h, { lift: pose.lift });
      c.save();
      c.clip(QJ.cutRect(WIN.w, WIN.h, 101, { r: 18, jag: 1.1 }));
      drawPageContent(c, t);
      c.restore();
      drawPageFront(c, t);
    });
    // Tape holding the window down.
    const tapeIn = (t0) => slap(t, t0, 0.14);
    [
      [A.tape1, wx(-10), wy(10), -0.7, 1],
      [A.tape2, wx(WIN.w + 6), wy(4), 0.62, 2],
    ].forEach(([t0, x, y, rot, seed]) => {
      const s = tapeIn(t0);
      if (!s.on) return;
      const out = away(t, A.clearPage, 0.6);
      QJ.tape(ctx, x - out * 500, y - out * 1400, 170 * s.scale, rot, { seed, alpha: s.alpha });
    });
  }

  // Things printed on or pasted onto the page, clipped to the window.
  function drawPageContent(c, t) {
    const clean = (k) => away(t, A.clearPage - 0.12 + k * 0.05, 0.5);
    const place = (lx, ly, rot, k, s, draw, w, h) => {
      const out = clean(k);
      if (out >= 1 || !s.on) return;
      QJ.piece(c, { x: lx - out * 900, y: ly - out * 260, rot: rot - out * 0.5, scale: s.scale, seed: 30 + k, alpha: s.alpha }, (cc) => {
        cc.translate(-w / 2, -h / 2);
        draw(cc, s.lift + out);
      });
    };

    const titleOut = clean(0);
    if (titleOut < 1) {
      c.save();
      c.translate(-titleOut * 900, -titleOut * 200);
      QJ.hand(c, "Hello, I make things.", 70, 150, { size: 82, color: C.ink, reveal: prog(t, A.titleWrite, A.titleWrite + 1.1), seed: 40 });
      QJ.pencilLines(c, 74, 206, 470, 3, 30, 41, "rgba(23,26,24,0.16)", prog(t, A.titleWrite + 0.6, A.titleWrite + 1.4));
      c.restore();
    }

    place(285, 460, -0.045, 1, slap(t, A.blog), (cc) => QJ.blogCard(cc), 440, 430);
    place(770, 305, 0.05, 2, slap(t, A.podcast), (cc) => QJ.podcastCard(cc, t), 400, 230);
    place(810, 555, -0.025, 3, slap(t, A.tool), (cc) => QJ.toolCard(cc, { typed: prog(t, A.tool + 0.12, A.tool + 0.75), done: prog(t, A.toolDone, A.toolDone + 0.6) }), 480, 190);

  }

  const goalFill = (t) => A.strips.reduce((sum, st) => sum + ease.out(prog(t, st, st + 0.3)), 0) / A.strips.length;

  function drawGoal(c, t) {
    const inP = prog(t, A.goalIn, A.goalIn + 0.5);
    const outP = away(t, A.clearGoal, 0.5);
    if (inP <= 0 || outP >= 1) return;
    const e = ease.settle(inP);
    const strips = A.strips.map((st) => prog(t, st, st + 0.3));
    QJ.piece(c, { x: GOAL.lx + (1 - e) * 1200 - outP * 1300, y: GOAL.ly - outP * 200, rot: -0.015 + (1 - e) * 0.2 - outP * 0.4, scale: 1.14, seed: 80 }, (cc) => {
      cc.translate(-390, -190);
      QJ.goalCard(cc, { fill: goalFill(t), strips, title: "Hosting for September", target: 50 });
    });
  }

  // The button sitting there day after day, fading into the page.
  function drawDays(c, t) {
    if (t < A.day1 || t > A.revive + 0.3) return;
    const a = 1 - prog(t, A.revive - 0.1, A.revive + 0.2);
    const label = t < A.day30 ? "day 1" : t < A.day90 ? "day 30" : "day 90";
    const since = t - (t < A.day30 ? A.day1 : t < A.day90 ? A.day30 : A.day90);
    QJ.hand(c, label, BUTTON.lx, BUTTON.ly + 150, { size: 56, color: C.ink, align: "center", reveal: clamp(since / 0.3), alpha: a, seed: 96 + (label.length % 3) });
    const op = prog(t, A.outline, A.outline + 0.6);
    if (op > 0) {
      const w = 420;
      const h = 124;
      const r = h / 2;
      const pts = [];
      for (let i = 0; i <= 90; i++) {
        const ang = (i / 90) * Math.PI * 2 + Math.PI;
        const side = Math.cos(ang) >= 0 ? w / 2 - r : -(w / 2 - r);
        pts.push([BUTTON.lx + side + Math.cos(ang) * r, BUTTON.ly + Math.sin(ang) * r]);
      }
      QJ.ink(c, pts, { w: 4, color: "rgba(23,26,24,0.55)", dash: [3, 14], reveal: op, alpha: a, seed: 97, taper: false });
    }
  }

  function drawNextMonth(c, t) {
    const p = prog(t, A.back + 0.1, A.back + 0.6);
    const out = prog(t, A.clearPage - 0.2, A.clearPage + 0.1);
    if (p <= 0 || out >= 1) return;
    QJ.hand(c, "next month", BUTTON.lx, BUTTON.ly + 150, { size: 56, color: C.ink, align: "center", reveal: p, alpha: 1 - out, seed: 98 });
  }

  // The pig, the button and the panel sit in front of the page content.
  function drawPageFront(c, t) {
    drawGoal(c, t);
    drawPig(c, t);
    drawButton(c, t);
    drawPanel(c, t);
    drawDays(c, t);
    drawNextMonth(c, t);
  }

  function drawPig(c, t) {
    if (t < A.pigPop || t > A.buttonIn + 0.2) return;
    const pop = prog(t, A.pigPop, A.pigPop + 0.35);
    const hopT0 = A.hop;
    const hopDur = (A.buttonIn - 0.08 - hopT0) / 2;
    let y = 0;
    let squash = 1;
    let legs = 0;
    for (let k = 0; k < 2; k++) {
      const h0 = hopT0 + k * hopDur;
      const p = prog(t, h0, h0 + hopDur);
      if (p > 0 && p < 1) {
        y -= Math.sin(p * Math.PI) * (k === 1 ? 170 : 70);
        legs = Math.sin(p * Math.PI) * 0.35;
        squash = p < 0.12 ? 0.9 : 1.04;
      }
    }
    const start = { x: 700, y: 862 };
    const end = { x: BUTTON.lx - 150, y: BUTTON.ly + 40 };
    const hop2 = ease.inOut(prog(t, hopT0 + hopDur, hopT0 + hopDur * 2));
    const x = lerp(start.x, end.x, hop2);
    y += lerp(start.y, end.y, hop2);
    const rise = ease.back(pop, 2.2);
    const flip = prog(t, A.buttonIn - 0.08, A.buttonIn + 0.04);
    const blink = Math.floor(t * 8) % 23 === 0 ? 1 : 0;
    QJ.pig(c, x, y + (1 - rise) * 60, 190 * Math.max(0.01, rise), {
      pose: { legFront: legs, legBack: -legs, ear: Math.sin(t * 9) * 0.04 + (pop < 1 ? (1 - pop) * 0.3 : 0), tail: Math.sin(t * 7) * 0.2, blink },
      sx: Math.max(0.02, 1 - flip) * (1 / squash),
      sy: squash,
      seed: 94,
      lift: (1 - rise) * 0.5,
    });
  }

  // In with a flip, gone entirely once the goal is met, back next month.
  function buttonPresence(t) {
    if (t < A.gone) return ease.back(prog(t, A.buttonIn - 0.02, A.buttonIn + 0.16), 2);
    if (t < A.back) return 1 - ease.in(prog(t, A.gone, A.gone + 0.25));
    return ease.back(prog(t, A.back, A.back + 0.18), 2);
  }

  function drawButton(c, t) {
    const presence = buttonPresence(t);
    if (presence > 0.001) {
      const press = (t > A.unfold - 0.12 && t < A.unfold + 0.02) || A.chipIns.some((st) => t >= st - 0.06 && t < st + 0.04) ? 1 : 0;
      const ghost = ease.inOut(prog(t, A.ghostStart, A.ghostEnd)) * (1 - ease.out(prog(t, A.revive, A.revive + 0.3)));
      const pop = Math.sin(prog(t, A.revive, A.revive + 0.35) * Math.PI) * 0.1;
      const nextMonth = t >= A.back;
      const goal = { p: nextMonth ? 1 : ease.out(prog(t, A.goalIn + 0.2, A.goalIn + 0.6)), fill: nextMonth ? 0 : goalFill(t) };
      QJ.piece(c, { x: BUTTON.lx, y: BUTTON.ly, sx: presence * (1 + pop), sy: (t >= A.gone && t < A.back ? presence : 1) + pop, seed: 95, alpha: 1 - ghost * 0.8 }, (cc) => {
        QJ.supportButton(cc, { press, goal });
      });
    }
    if (t < A.gone + 0.15) QJ.stamp(c, "Covered", BUTTON.lx + 40, BUTTON.ly - 118, { size: 44, p: prog(t, A.covered, A.covered + 0.5), rot: -0.14, seed: 81 });
  }

  function drawPanel(c, t) {
    const open = prog(t, A.unfold, A.unfold + 0.36);
    const close = prog(t, A.fold, A.fold + 0.26);
    const amount = ease.back(open, 1.6) * (1 - ease.in(close));
    if (amount <= 0.01) return;
    const s = {
      apple: prog(t, A.chipApple, A.chipApple + 0.4),
      ideal: prog(t, A.chipIdeal, A.chipIdeal + 0.4),
      card: prog(t, A.chipCard, A.chipCard + 0.4),
      selected: t >= A.tap1 ? 1 : -1,
      pressed: t >= A.tap2 && t < A.tap2 + 0.12 ? "apple" : null,
      thanks: prog(t, A.stamp, A.stamp + 0.4),
      lift: 0,
    };
    c.save();
    c.translate(PANEL.lx + PANEL.w, PANEL.ly + PANEL.h);
    c.scale(lerp(0.7, 1, amount), amount);
    c.translate(-PANEL.w, -PANEL.h);
    QJ.panel(c, s);
    // Crease shading while the panel unfolds.
    if (amount < 0.98) {
      c.fillStyle = `rgba(40,30,20,${(1 - amount) * 0.25})`;
      c.fillRect(0, 0, PANEL.w, PANEL.h / 2);
    }
    c.restore();
  }

  // ---------- cursors ----------

  function readerPos(t) {
    const tapAt = [wx(BUTTON.lx - 10), wy(BUTTON.ly + 14)];
    const f = keyframes(t, [
      [A.cursorsIn, 2050, 1150],
      [A.cursorsIn + 0.8, 1180, 660, "out"],
      [A.pigPop - 0.2, 1060, 600],
      [A.pigPop + 0.6, 1560, 760],
      [A.ghostStart, 1560, 760],
      [A.ghostStart + 1.1, 2400, 640, "in"],
      [A.goalIn + 0.2, 2400, 900],
      [A.stripsStart - 0.45, tapAt[0], tapAt[1], "out"],
      [A.unfold, tapAt[0], tapAt[1]],
      [A.tap1 - 0.02, wx(PANEL.lx + 202), wy(PANEL.ly + 132)],
      [A.tap2 - 0.35, wx(PANEL.lx + 202), wy(PANEL.ly + 132)],
      [A.tap2 - 0.02, wx(PANEL.lx + 110), wy(PANEL.ly + 262)],
      [A.stamp + 0.05, wx(PANEL.lx + 110), wy(PANEL.ly + 262)],
      [A.stamp + 0.55, wx(PANEL.lx + 590), wy(PANEL.ly + 420)],
      [A.fold + 0.3, wx(PANEL.lx + 590), wy(PANEL.ly + 420)],
      [A.fold + 0.9, 1130, 800],
    ]);
    // Small hops on each chip-in.
    const hop = A.chipIns.reduce((y, st) => y - Math.sin(prog(t, st - 0.2, st + 0.1) * Math.PI) * 26, 0);
    return { x: f.x, y: f.y + hop };
  }

  function drawReader(ctx, t) {
    if (t < A.cursorsIn) return;
    const p = readerPos(t);
    const idle = QJ.noise1(t * 1.3, 4) * 6;
    const clicks = [A.tap1, A.tap2, ...A.chipIns];
    const press = clicks.some((c) => t >= c - 0.04 && t < c + 0.08) ? 1 : 0;
    const outP = away(t, A.clearPage - 0.2, 0.5);
    QJ.cursor(ctx, p.x + idle + outP * 900, p.y + QJ.noise1(t * 1.1, 9) * 4 + outP * 300, { seed: 140, press, scale: 1.25, alpha: 1 - outP });
    for (const c of clicks) QJ.ripple(ctx, p.x, p.y, prog(t, c, c + 0.45), { seed: 141 });
  }

  // Other visitors, early on.
  function drawVisitors(ctx, t) {
    const vs = [
      { x0: -120, y0: 700, x: 600, y: 520, seed: 150, delay: 0.15 },
      { x0: 1500, y0: 1250, x: 1400, y: 820, seed: 151, delay: 0.3 },
    ];
    for (const v of vs) {
      const tin = A.cursorsIn + v.delay;
      if (t < tin || t > A.pigPop + 0.8) continue;
      const p = keyframes(t, [
        [tin, v.x0, v.y0],
        [tin + 0.8, v.x, v.y, "out"],
        [A.pigPop, v.x, v.y],
        [A.pigPop + 0.8, v.x0 < 0 ? -300 : 2300, v.y + 100, "in"],
      ]);
      QJ.cursor(ctx, p.x + QJ.noise1(t * 1.2, v.seed) * 8, p.y + QJ.noise1(t, v.seed + 3) * 6, { seed: v.seed, scale: 1.1 });
    }
  }

  // Visitors gliding straight past the button without stopping.
  function drawPassers(ctx, t) {
    const lanes = [
      { y: 800, from: -200, to: 2300, dur: 1.6, seed: 170 },
      { y: 900, from: 2300, to: -200, dur: 1.8, seed: 171 },
      { y: 720, from: -200, to: 2300, dur: 1.5, seed: 172 },
    ];
    lanes.forEach((l, i) => {
      const t0 = A.passers + i * 0.8;
      const p = prog(t, t0, t0 + l.dur);
      if (p <= 0 || p >= 1) return;
      const x = lerp(l.from, l.to, p);
      const y = l.y + Math.sin(p * Math.PI * 2 + i) * 24;
      QJ.cursor(ctx, x, y, { seed: l.seed, scale: 1.2, rot: l.from < l.to ? -0.05 : 0.05 });
    });
  }

  // ---------- overlays ----------

  function drawHearts(ctx, t) {
    const hs = [
      [720, 420, C.red, 0],
      [1110, 360, C.green, 0.12],
      [1380, 620, C.pale, 0.22],
    ];
    for (const [x, y, fill, d] of hs) {
      const p = prog(t, A.hearts + d, A.hearts + d + 1.3);
      if (p <= 0 || p >= 1) continue;
      const s = ease.back(clamp(p * 4), 3) * (1 - ease.in(clamp((p - 0.7) / 0.3)));
      QJ.piece(ctx, { x, y: y - p * 70, rot: (d - 0.1) * 2, scale: s * 1.6, seed: 180 + d * 10 }, (c) => QJ.paper(c, QJ.heartPath(), { fill, lift: 0.3 }));
    }
  }

  // ---------- pricing ----------

  function drawFee(ctx, t) {
    const tags = [
      { t0: A.tagFee, x: 690, y: 560, rot: -0.07, w: 440, h: 250, fill: "#efe2c2", seed: 300 },
      { t0: A.tagPct, x: 1250, y: 580, rot: 0.05, w: 520, h: 250, fill: C.green, seed: 310 },
    ];
    tags.forEach((g, i) => {
      const d = drop(t, g.t0, 0.32);
      if (!d.on) return;
      const out = away(t, A.clearFee + i * 0.06, 0.5);
      if (out >= 1) return;
      const x = g.x + out * (i ? 900 : -900);
      const y = g.y + out * 200;
      QJ.piece(ctx, { x, y, rot: g.rot + out * (i ? 0.5 : -0.5), scale: d.scale, seed: g.seed, alpha: d.alpha }, (c) => {
        c.translate(-g.w / 2, -g.h / 2);
        QJ.ink(c, QJ.spline([[46, g.h / 2], [10, g.h / 2 - 90], [60, -120], [30, -400]], 10), { w: 3, color: "rgba(23,26,24,0.7)", seed: g.seed + 5, taper: false });
        QJ.tag(c, g.w, g.h, g.seed, g.fill);
        if (i === 0) {
          QJ.text(c, "€0", 110, 150, { size: 128, weight: 800, color: C.ink, spacing: -3 });
          QJ.text(c, "a month", 112, 200, { size: 34, weight: 600, color: C.body });
        } else {
          QJ.text(c, "5%", 110, 150, { size: 128, weight: 800, color: "#fbf8f1", spacing: -3 });
          QJ.ink(c, QJ.circlePts(176, 102, 104, 56, { turns: 1.12, seed: 7, start: -2.6 }), { w: 5, color: "#fbf8f1", seed: 315, reveal: prog(t, A.pctCircle, A.pctCircle + 0.5), rough: 1.4, alpha: 0.9 });
          QJ.text(c, "of what you receive", 112, 200, { size: 34, weight: 600, color: "#cfe5d7" });
        }
      });
    });
  }

  // ---------- end card ----------

  const LOCK = (() => {
    const k = 4.6;
    const x0 = 960 - 119 * k;
    const y0 = 300;
    return { k, x0, y0, pigX: x0 + 42 * k, pigY: y0 + 54.95 * k, pigH: 140 * 0.35 * k, wordX: x0 + 86 * k, wordY: y0 + 42.9 * k, wordS: 0.42 * k };
  })();

  const TAGLINE = "Ask when it matters. Then go quiet.";

  function drawLogo(ctx, t) {
    if (t < A.logo) return;
    const L = LOCK;
    const p = prog(t, A.logo, A.logo + 0.45);
    const e = ease.settle(p);
    const hop = prog(t, A.endHop, A.endHop + 0.45);
    const hopY = Math.sin(hop * Math.PI) * 50;
    const squash = hop > 0 && hop < 0.15 ? 0.92 : hop > 0.85 && hop < 1 ? 0.94 : 1;
    const blink = (t > A.endHop + 0.9 && t < A.endHop + 1.0) || (t > A.tagline + 0.8 && t < A.tagline + 0.9) ? 1 : 0;
    QJ.pig(ctx, L.pigX, L.pigY - (1 - e) * 700 - hopY, L.pigH, {
      rot: (1 - e) * 0.4,
      sx: 1 / squash,
      sy: squash,
      lift: 1 - ease.out(p),
      pose: { ear: hop > 0 && hop < 1 ? -0.15 : 0, legFront: hopY ? 0.25 : 0, legBack: hopY ? -0.25 : 0, tail: Math.sin(t * 5) * 0.15, blink },
      seed: 400,
    });

    const glyphs = QJ.glyphs();
    const letters = glyphs.filter((g) => !g.dot).sort((a, b) => a.box.x0 - b.box.x0);
    const dots = glyphs.filter((g) => g.dot);
    const seq = [...letters, ...dots];
    const span = 0.55;
    seq.forEach((g, i) => {
      const t0 = A.logoWord - 0.05 + (i / (seq.length - 1)) * span + (g.dot ? 0.15 : 0);
      const d = prog(t, t0, t0 + 0.28);
      if (d <= 0) return;
      const fall = ease.in(d);
      const gx = L.wordX + g.cx * L.wordS;
      const gy = L.wordY + g.cy * L.wordS;
      QJ.piece(ctx, { x: gx, y: gy - (1 - fall) * (g.dot ? 260 : 180), rot: (1 - fall) * (QJ.hash(i) - 0.5) * 0.8, scale: lerp(1.25, 1, fall), seed: 410 + i, alpha: clamp(d * 5) }, (c) => {
        c.scale(L.wordS, L.wordS);
        c.translate(-g.cx, -g.cy);
        const z = QJ.frame.zoom;
        c.save();
        c.shadowColor = `rgba(58,42,22,${0.26 - (1 - fall) * 0.08})`;
        c.shadowBlur = ((7 + (1 - fall) * 30) * z) / 1;
        c.shadowOffsetX = (2.5 + (1 - fall) * 14) * z;
        c.shadowOffsetY = (4.5 + (1 - fall) * 22) * z;
        c.fillStyle = g.tone === "green" ? C.green : "#1c201e";
        c.fill(g.path, "evenodd");
        c.restore();
        c.save();
        c.clip(g.path, "evenodd");
        c.globalCompositeOperation = "soft-light";
        c.globalAlpha = 0.5;
        c.fillStyle = QJ.grain;
        c.fillRect(g.box.x0 - 10, g.box.y0 - 10, g.box.x1 - g.box.x0 + 20, g.box.y1 - g.box.y0 + 20);
        c.restore();
      });
    });

    const ts = drop(t, A.tagline, 0.3);
    if (ts.on) {
      QJ.piece(ctx, { x: 960, y: 700, rot: -0.012, scale: ts.scale, seed: 430, alpha: ts.alpha }, (c) => {
        const w = 940;
        const h = 104;
        c.translate(-w / 2, -h / 2);
        QJ.paper(c, QJ.cutRect(w, h, 431, { jag: 1.6 }), { fill: C.paper, lift: ts.lift });
        QJ.text(c, TAGLINE, w / 2, 68, { size: 50, weight: 700, color: C.ink, align: "center", spacing: -1 });
      });
      const up = prog(t, A.underline, A.underline + 0.45);
      const full = QJ.measure(ctx, TAGLINE, 50, QJ.FONT.sans, 700);
      const tail = QJ.measure(ctx, "go quiet.", 50, QJ.FONT.sans, 700);
      const x1 = 960 + full / 2;
      const x0 = x1 - tail;
      QJ.ink(ctx, QJ.spline([[x0, 772], [lerp(x0, x1, 0.35), 778], [lerp(x0, x1, 0.75), 770], [x1, 775]], 8), { w: 6, color: C.green, seed: 432, reveal: up, rough: 1.5 });
      QJ.text(ctx, "quietjar.com", 960, 862, { size: 34, weight: 600, color: C.body, align: "center", alpha: prog(t, A.underline + 0.2, A.underline + 0.6) });
    }
  }

  // ---------- frame ----------

  QJ.render = (ctx, tReal) => {
    const t = QJ.snap(tReal);
    QJ.frame.t = t;
    QJ.frame.boil = Math.floor(tReal * QJ.BOIL_FPS + 1e-6);
    const cam = camera(t);
    QJ.frame.zoom = cam.z;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = C.desk;
    ctx.fillRect(0, 0, W, H);
    ctx.setTransform(1, 0, 0, 1, W / 2, H / 2);
    ctx.rotate(cam.r);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);

    QJ.drawDesk(ctx);
    drawWindow(ctx, t);
    drawHearts(ctx, t);
    drawVisitors(ctx, t);
    drawPassers(ctx, t);
    drawReader(ctx, t);
    drawFee(ctx, t);
    drawLogo(ctx, t);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Lamp light and a soft vignette, with the faint exposure flicker of stop motion.
    const g = ctx.createRadialGradient(W * 0.45, H * 0.4, H * 0.2, W * 0.5, H * 0.5, H * 1.05);
    g.addColorStop(0, "rgba(255,248,235,0.06)");
    g.addColorStop(0.6, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(70,50,25,0.24)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const flicker = QJ.hash(QJ.frame.boil * 3.3) - 0.5;
    ctx.fillStyle = flicker > 0 ? `rgba(255,250,240,${flicker * 0.035})` : `rgba(40,30,15,${-flicker * 0.03})`;
    ctx.fillRect(0, 0, W, H);
  };
})(typeof window !== "undefined" ? window : globalThis);

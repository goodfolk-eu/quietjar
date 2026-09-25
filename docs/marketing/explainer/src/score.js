// The cue sheet. Every visual beat and sound effect hangs off a word in the
// voiceover, so re-recording the voice keeps picture and sound in sync.
// Shared by the browser (animation) and Node (audio mix).
(function (root) {
  function buildScore(T) {
    const byId = Object.fromEntries(T.lines.map((l) => [l.id, l]));
    const S = (id) => byId[id].start;
    const E = (id) => byId[id].end;
    const W = (id, word, nth = 0) => {
      const hits = byId[id].words.filter((w) => w.word === word);
      const hit = hits[nth] ?? hits[0];
      if (!hit) throw new Error(`word "${word}" not in line "${id}"`);
      return byId[id].start + hit.t;
    };

    const A = {
      total: T.total,

      winDrop: 0.25,
      winLand: 0.7,
      tape1: 0.92,
      tape2: 1.08,
      titleWrite: S("made") + 0.05,
      cursorsIn: W("made", "people") - 0.25,
      hearts: W("made", "love"),
      blog: W("made", "something") - 0.06,
      podcast: W("made", "people") - 0.06,
      tool: W("made", "love") + 0.1,

      addStart: S("add") - 0.02,
      buttonIn: W("add", "button") - 0.05,

      ghostStart: S("stays") + 0.2,
      day1: W("stays", "every") - 0.05,
      day30: W("stays", "every", 1) - 0.05,
      day90: W("stays", "day") - 0.05,
      passers: S("stays") + 0.2,
      ghostEnd: W("ignore", "sees") + 0.2,
      outline: W("ignore", "nobody") - 0.05,

      revive: S("goal") - 0.1,
      goalIn: W("goal", "finish") - 0.35,
      stripsStart: W("fills", "chip"),
      stripsEnd: W("fills", "fills"),
      clearGoal: S("methods") - 0.45,

      unfold: S("methods") - 0.2,
      chipApple: W("methods", "apple") - 0.02,
      chipIdeal: W("methods", "ideal") - 0.02,
      chipCard: W("methods", "card") - 0.02,
      tap1: W("methods", "card") + 0.4,

      fold: S("met") - 0.35,
      covered: W("met", "met"),
      gone: W("met", "disappears") - 0.05,
      back: W("next", "back") - 0.05,
      clearPage: E("next") + 0.5,

      tagFee: S("fee") - 0.02,
      tagPct: W("fee", "five") - 0.12,
      pctCircle: W("fee", "receive") - 0.1,
      clearFee: E("fee") + 0.3,

      logo: S("name") - 0.45,
      logoWord: W("name", "quiet") - 0.05,
      tagline: S("tag") - 0.08,
      underline: W("tag", "quiet") - 0.05,
      endHop: E("tag") + 0.55,
    };

    A.toolDone = A.tool + 0.8;
    A.tap2 = A.tap1 + 0.45;
    A.stamp = A.tap2 + 0.3;

    // Four visitors chip in from the button, then the on-page payment closes the goal.
    A.chipIns = [];
    const CHIPS = 4;
    for (let i = 0; i < CHIPS; i++) A.chipIns.push(A.stripsStart + ((A.stripsEnd - A.stripsStart) * i) / (CHIPS - 1));
    A.strips = [...A.chipIns, A.stamp + 0.45, A.stamp + 0.65];

    const sfx = [
      { t: A.winDrop, type: "slide", gain: 0.5 },
      { t: A.winLand, type: "thud", gain: 0.9 },
      { t: A.tape1, type: "tape", gain: 0.6 },
      { t: A.tape2, type: "tape", gain: 0.5, pitch: 1.1 },
      { t: A.titleWrite, type: "pencil", gain: 0.35, dur: 1.2 },
      { t: A.hearts, type: "pop", gain: 0.35, pitch: 1.5 },
      { t: A.hearts + 0.18, type: "pop", gain: 0.25, pitch: 1.8 },
      { t: A.blog, type: "slap", gain: 0.7 },
      { t: A.podcast, type: "slap", gain: 0.7, pitch: 0.95 },
      { t: A.tool, type: "slap", gain: 0.7, pitch: 1.05 },
      { t: A.toolDone, type: "blip", gain: 0.3 },
      { t: A.buttonIn, type: "flip", gain: 0.6 },
      ...[A.day1, A.day30, A.day90].map((t, i) => ({ t, type: "pencil", gain: 0.3, dur: 0.35, pitch: 1 + i * 0.06 })),
      ...[0, 1, 2].map((i) => ({ t: A.passers + i * 0.8 + 0.5, type: "drift", gain: 0.2, pitch: 1.2 - i * 0.08 })),
      { t: A.outline, type: "pencil", gain: 0.3, dur: 0.6 },
      { t: A.revive, type: "pop", gain: 0.55, pitch: 1.2 },
      { t: A.goalIn, type: "slide", gain: 0.55 },
      ...A.strips.map((t, i) => ({ t, type: "tape", gain: 0.4, pitch: 0.9 + i * 0.05 })),
      ...A.chipIns.map((t) => ({ t: t - 0.06, type: "click", gain: 0.25, pitch: 1.2 })),
      { t: A.clearGoal, type: "whoosh", gain: 0.45, dur: 0.6, pitch: 1.2 },
      { t: A.unfold, type: "fold", gain: 0.6 },
      { t: A.chipApple, type: "pop", gain: 0.5, pitch: 1.0 },
      { t: A.chipIdeal, type: "pop", gain: 0.5, pitch: 1.19 },
      { t: A.chipCard, type: "pop", gain: 0.5, pitch: 1.33 },
      { t: A.tap1, type: "click", gain: 0.6 },
      { t: A.tap2, type: "click", gain: 0.6, pitch: 1.1 },
      { t: A.stamp, type: "pop", gain: 0.65, pitch: 0.8 },
      { t: A.stamp + 0.05, type: "chime", gain: 0.45 },
      { t: A.fold, type: "fold", gain: 0.55, pitch: 1.1 },
      { t: A.covered, type: "stamp", gain: 0.8 },
      { t: A.covered + 0.05, type: "chime", gain: 0.4, pitch: 1.12 },
      { t: A.gone, type: "whoosh", gain: 0.45, dur: 0.5, pitch: 1.3 },
      { t: A.back, type: "flip", gain: 0.6 },
      { t: A.back + 0.05, type: "pop", gain: 0.4, pitch: 1.3 },
      { t: A.clearPage, type: "whoosh", gain: 0.45, dur: 0.6, pitch: 1.2 },
      { t: A.tagFee, type: "thud", gain: 0.75 },
      { t: A.tagPct, type: "thud", gain: 0.75, pitch: 1.1 },
      { t: A.pctCircle, type: "pencil", gain: 0.3, dur: 0.5 },
      { t: A.clearFee, type: "whoosh", gain: 0.45, dur: 0.6, pitch: 1.1 },
      { t: A.logo, type: "tap", gain: 0.35 },
      { t: A.logo + 0.12, type: "tap", gain: 0.3, pitch: 1.1 },
      { t: A.logo + 0.24, type: "tap", gain: 0.3, pitch: 0.95 },
      { t: A.logo + 0.36, type: "slap", gain: 0.5 },
      { t: A.tagline, type: "slide", gain: 0.45 },
      { t: A.underline, type: "pencil", gain: 0.3, dur: 0.5 },
      { t: A.endHop, type: "tap", gain: 0.3 },
    ];

    return { A, sfx, S, E, W };
  }

  root.QJScore = { buildScore };
})(typeof window !== "undefined" ? window : globalThis);

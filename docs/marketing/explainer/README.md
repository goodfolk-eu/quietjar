# QuietJar explainer

A 44 second hand-drawn collage explainer. Everything is code: the animation is
plain JavaScript on a canvas, the score and sound effects are synthesised in
Node, and the voice is Amazon Polly (long-form voice "Danielle").

## Files

- `lines.json` - the script, one entry per voice line
- `src/score.js` - the cue sheet: every visual beat and sound effect is tied to a word in the voiceover
- `src/engine.js` - drawing kit: cut paper, torn edges, tape, ink, lettering
- `src/props.js` - the pig, the wordmark and the paper mock-ups
- `src/scenes.js` - the film itself, `render(ctx, t)`
- `index.html` - plays the animation in the browser, in sync with the soundtrack
- `quietjar-explainer.mp4` - the rendered film (1920x1080, 24 fps, AAC)

## Rebuild

Needs Node, ffmpeg, Google Chrome and AWS credentials with Polly access.

```sh
npm install
npm run build     # voice -> timeline -> soundtrack -> mp4
npm run preview   # open http://localhost:4400 to watch it live
```

Change a line in `lines.json` and rebuild: timings follow the new voiceover.
Pacing between lines lives in `prep.mjs`. `node render.mjs --stills 12,30`
writes single frames to `build/stills/` for quick checks.

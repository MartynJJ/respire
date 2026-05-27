# Respire — Claude Code instructions

## Git workflow

Never commit directly to `master`. All changes go through a PR:

1. Create a feature branch: `git checkout -b <short-kebab-description>`
2. Commit work to that branch
3. **Before pushing:** run `node --check app.js` — a syntax error breaks the live site instantly (GitHub Pages, no CI gate)
4. Push: `git push -u origin <branch>`
5. Open a PR targeting `master` with `gh pr create`
6. Review the diff, then merge with `gh pr merge --squash`

Branch names: short and descriptive, e.g. `fix-slider-scroll`, `add-vocal-guidance`, `update-defaults`

## Local testing

A local server can be started for manual testing before pushing:

```bash
cd ~/repos/respire && python3 -m http.server 9876
```

Smoke-test the running app with headless Chrome:

```bash
google-chrome --headless=new --no-sandbox --disable-gpu \
  --virtual-time-budget=3000 --dump-dom http://localhost:9876/ \
  | grep -q 'data-theme' && echo 'PASS' || echo 'FAIL: JS did not initialise'
```

## Versioning

`const VERSION` in `app.js` is auto-bumped by the `bump-version` GitHub Actions workflow on every merge to master. The patch number equals the commit count on master (`git rev-list --count HEAD`). Do not edit `VERSION` manually.

## Vocal cue audio clips

Pre-recorded MP3s live in `audio/` and are served by GitHub Pages alongside the app. They are committed to the repo — do not gitignore them.

| File pattern | Voice | Phrases |
|---|---|---|
| `female-*.mp3` | OpenAI `nova` | breathe-in, and-out, hold, hold-breath, recovery |
| `male-*.mp3` | OpenAI `onyx` | same |

`app.js` fetches all 10 clips at init (`audio.loadClips()`), decodes them once the `AudioContext` is available, and plays via `AudioBufferSourceNode`. If a clip isn't ready yet, `audio.speak()` falls back to `speechSynthesis`.

### Regenerating clips

Clips are generated via OpenRouter → `openai/gpt-audio-mini`. The API key is in `~/openrouter/.env` on the VPS (107.175.228.97). Use the `/generate-tts-clips` skill, which contains the full generation script and WAV/MP3 encoding procedure.

Quick steps on the VPS:
1. `pip install lameenc --break-system-packages` (one-time)
2. Run the generation script from the skill — outputs to `audio/`
3. Check clip durations in the output; regenerate any that are too long using `prompt_style='crisp'`
4. Commit the updated MP3s via the normal PR workflow

## Deployment

The site is served via **GitHub Pages** from the `master` branch root.  
Live URL: `https://martynjj.github.io/respire/`  
Deploys automatically on every push to `master` (~30 s propagation).  
There is no CI — a bad merge goes live immediately.

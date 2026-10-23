# Respire

A browser-based breathing and meditation app. Warm cream + coral aesthetic, three-ring breath orb, Geist typography. Vanilla HTML/CSS/JS — no build step.

## Features

- **Breathwork** — Round-by-round cycles with a 3-second countdown, eased orb animation, mid-cycle holds, open-ended retention hold, and timed recovery.
- **Meditation timer** — Preset durations (5/10/15/20/30 min) or a custom 1–90 min slider. Optional interval bell.
- **Presets** — Power Breath, Box 4-4-4-4, 4-7-8, Tummo. Fully customisable: cycles per round, inhale/hold/exhale/hold timings, recovery length.
- **History** — Sessions stored in localStorage. Stats card (total sessions, total time, best hold) and per-session rows.
- **Settings** — Dark mode, sound chimes, haptic feedback, voice guidance (Web Speech API).
- **Screen stays on** — Screen Wake Lock API, with a NoSleep.js fallback for browsers without it (e.g. Firefox).
- **No build step** — Plain HTML/CSS/JS. Geist from Google Fonts and NoSleep.js from cdnjs are the only external requests.

## Quick start

```bash
git clone https://github.com/MartynJJ/respire.git
cd respire
python3 -m http.server 8000
# open http://localhost:8000
```

Or just open `index.html` directly — Web Audio API works best over HTTP.

## Breathwork cycle

```
countdown (3s) → [inhale → (holdIn) → exhale → (holdOut)] × N cycles
              → retention hold (open-ended, tap to finish)
              → recovery (default 15s)
              → next round, or done
```

Phases with duration `0` are skipped.

## Audio

- **Phase tones** — Web Audio oscillators: inhale sweeps 220→440 Hz, exhale 400→200 Hz, holds 110 Hz, recovery 440 Hz, plus a three-partial singing-bowl chime at round/session end and for interval bells.
- **Voice guidance** (Settings → Voice) — pre-recorded clips in `audio/` (`female-*.mp3`, `male-*.mp3`: breathe-in, and-out, hold, hold-breath, recovery), decoded once into `AudioBuffer`s and played with a speed-up on short phases. Falls back to the Web Speech API until clips load.

## localStorage keys

| Key                       | Value                                                           |
|---------------------------|-----------------------------------------------------------------|
| `respire_breath`          | `{ rounds, cycles, inhale, holdIn, exhale, holdOut, recovery }` |
| `respire_med`             | `{ duration, bell, interval }`                                  |
| `respire_tweaks`          | `{ dark, sound, haptics, vocal, voiceGender }`                  |
| `respire_history`         | `[{ kind, date, … }]`                                           |
| `respire_onboarding_done` | `"true"` after first run                                        |

History entries carry an `at` timestamp (ms since epoch) and are shown as Today / Yesterday / date. Legacy `respire_sessions` data is migrated into `respire_history` on first load.

## Project structure

```
index.html                       — app shell
style.css                        — design system (tokens, orb, sheet, tab bar)
app.js                           — scene router, audio/haptics/wake-lock, session state machines
audio/                           — pre-recorded vocal cue clips
.github/workflows/bump-version.yml — auto-bumps VERSION in app.js on merge to master
CLAUDE.md                        — contributor/agent workflow notes
```

## Deployment

Served by GitHub Pages from the root of `master`. There is no CI gate, so run `node --check app.js` before merging.

## License

MIT

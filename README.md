# Respire

A browser-based breathing and meditation app. Warm cream + coral aesthetic, three-ring breath orb, refined typography (Geist). Vanilla HTML/CSS/JS — no build step.

## Features

- **Breathwork session** — Round-by-round cycles with a 3-second countdown, eased orb animation per inhale/exhale, mid-cycle holds, open-ended retention hold, and timed recovery.
- **Meditation timer** — Preset durations (5/10/15/20/30m) or a custom 1–90 min slider. Optional interval bell.
- **Presets** — Wim Hof, Box 4-4-4-4, 4-7-8, Tummo. Or fully tune cycles per round, inhale/hold/exhale/hold timings, and recovery length.
- **History** — Sessions stored in localStorage. Stats card (total sessions, total time, best hold) + per-session rows.
- **Settings** — Dark mode (warm-black), sound chimes, haptic feedback.
- **Bottom tab bar** — Home · History · Settings.
- **Zero dependencies** — Plain HTML/CSS/JS. Loads Geist from Google Fonts.

## Quick Start

1. Clone or download the repo.
2. Open `index.html` in a modern browser, or serve the directory over HTTP (recommended for the Web Audio API).
3. First load walks through the 3-slide onboarding.

```bash
# optional local server
python3 -m http.server 8000
```

## How it works

### Breathwork cycle

Each round runs as a state machine:

```
countdown (3s) → [inhale → (holdIn) → exhale → (holdOut)] × N cycles
              → retention (open-ended)
              → recovery (configurable, default 15s)
              → next round, or done
```

Holds with duration `0` are skipped automatically.

### Audio cues

Generated with Web Audio API oscillators:

| Phase            | Frequency | Type   |
|------------------|-----------|--------|
| Inhale           | 220 Hz    | sine   |
| Exhale           | 330 Hz    | sine   |
| Hold (in / out)  | 110 Hz    | sine   |
| End of cycles    | 330 Hz    | sine   |
| Recovery start   | 440 Hz    | sine   |
| Round/end chime  | 660 + 990 | sine   |
| Countdown end    | 880 Hz    | square |

Toggle in Settings → **Sound**.

### Haptics

Short `navigator.vibrate` pulses on inhale/exhale, longer patterns at retention start, recovery, and session end. Toggle in Settings → **Haptics**.

## Persistence (localStorage)

| Key                          | Contents                                           |
|------------------------------|----------------------------------------------------|
| `respire_breath`             | `{ rounds, cycles, inhale, holdIn, exhale, holdOut, recovery }` |
| `respire_med`                | `{ duration, bell, interval }`                     |
| `respire_tweaks`             | `{ dark, sound, haptics }`                         |
| `respire_history`            | `[{ kind, date, ... }]`                            |
| `respire_onboarding_done`    | `"true"` once finished                             |

On first load, any legacy `respire_sessions` data is migrated into `respire_history` with `kind: "breath"`.

## Browser compatibility

Modern Chromium / Firefox / Safari. Uses Web Audio API and `navigator.vibrate` (vibration is no-op where unsupported).

## Project structure

```
index.html   — minimal shell, mounts #app-shell
style.css    — design system (warm cream/coral, orb, sheet, tab bar)
app.js       — vanilla port of the React design (scene router + session FSM)
```

## License

MIT

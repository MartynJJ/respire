# Respire

A browser-based breathing and meditation app. Warm cream + coral aesthetic, three-ring breath orb, Geist typography. Vanilla HTML/CSS/JS — no build step.

## Features

- **Breathwork** — Round-by-round cycles with a 3-second countdown, eased orb animation, mid-cycle holds, open-ended retention hold, and timed recovery.
- **Meditation timer** — Preset durations (5/10/15/20/30 min) or a custom 1–90 min slider. Optional interval bell.
- **Presets** — Wim Hof, Box 4-4-4-4, 4-7-8, Tummo. Fully customisable: cycles per round, inhale/hold/exhale/hold timings, recovery length.
- **History** — Sessions stored in localStorage. Stats card (total sessions, total time, best hold) and per-session rows.
- **Settings** — Dark mode, sound chimes, haptic feedback, voice guidance (Web Speech API).
- **Zero dependencies** — Plain HTML/CSS/JS. Geist loaded from Google Fonts.

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

Tones generated with the Web Audio API:

| Phase           | Frequency  | Waveform |
|-----------------|------------|----------|
| Inhale          | 220 Hz     | sine     |
| Exhale          | 330 Hz     | sine     |
| Hold (in/out)   | 110 Hz     | sine     |
| Recovery        | 440 Hz     | sine     |
| Round/end chime | 660 + 990  | sine     |
| Countdown       | 880 Hz     | square   |

Voice guidance (Settings → Voice) announces each phase name via the Web Speech API.

## localStorage keys

| Key                       | Value                                                           |
|---------------------------|-----------------------------------------------------------------|
| `respire_breath`          | `{ rounds, cycles, inhale, holdIn, exhale, holdOut, recovery }` |
| `respire_med`             | `{ duration, bell, interval }`                                  |
| `respire_tweaks`          | `{ dark, sound, haptics, vocal, voiceGender }`                  |
| `respire_history`         | `[{ kind, date, … }]`                                           |
| `respire_onboarding_done` | `"true"` after first run                                        |

Legacy `respire_sessions` data is migrated into `respire_history` on first load.

## Project structure

```
index.html   — app shell
style.css    — design system (tokens, orb, sheet, tab bar)
app.js       — scene router + session FSM
```

## License

MIT

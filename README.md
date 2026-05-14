# Respire

A beautifully simple, browser-based app for guided cyclic breathing exercises. Perfect for improving breath control, focus, and relaxation.

## Features

- **Guided Power Breathing**: 30-breath cycles with visual and audio cues
- **Retention Hold**: Track how long you can hold your breath
- **Recovery Breath**: 15-second guided recovery phase
- **Multi-Round Sessions**: Complete 3+ rounds in a single session
- **Meditation Timer**: Standalone meditation mode with configurable durations and optional interval bells
- **Session Logging**: All hold times saved to browser localStorage
- **Zero Dependencies**: No npm packages, no build step
- **Audio Feedback**: Web Audio API tone generation (configurable mute)

## Quick Start

1. Clone or download this repo
2. Open `index.html` in a web browser
3. Click "Start" to begin

That's it! No server needed.

## How It Works

### The Breathing Cycle

Each round consists of 4 phases:

1. **Power Breathing** (~2.5 minutes)
   - 30 deep breath cycles
   - Visual circle expands/contracts to guide tempo
   - Audio cues for inhale/exhale

2. **Retention Hold** (variable)
   - After final exhale, hold your breath as long as possible
   - Timer starts when you click "Start Hold"
   - Click "Done" when you need to breathe
   - Your hold time is recorded

3. **Recovery Breath** (15 seconds)
   - Deep inhale and hold for 15 seconds
   - Countdown with audio cues

4. **Repeat**
   - Default: 3 rounds per session
   - Configurable in the UI

### Meditation Timer

Switch to the **Meditate** tab on the idle screen to access the meditation timer.

- **Duration**: Choose from preset durations (5, 10, 15, 20, 30 minutes) or enter a custom duration
- **Interval Bells** (optional): Enable to hear a soft bell tone every 60 seconds
- **Countdown**: Timer counts down the remaining time
- **End Tone**: A louder, distinct chime sounds when meditation is complete
- **Stop Anytime**: Click "Stop" to end the meditation session early

Perfect for daily mindfulness practice alongside the breathwork sessions.

### Audio Cues

**Breathwork:**
- **Inhale**: Low tone (220 Hz)
- **Exhale**: Mid tone (330 Hz)
- **Hold Start**: Deep gong (110 Hz)
- **Recovery**: Bright chime (440 Hz)
- **Countdown**: Rapid beeps (880 Hz) in final 3 seconds

**Meditation:**
- **Interval Bell**: Soft tone (528 Hz) every 60 seconds (optional)
- **End Tone**: Louder chime (440 Hz + 880 Hz) when meditation completes

Mute/unmute anytime with the 🔊 button. Muting suppresses all audio cues.

## Session Logs

All sessions are automatically saved to browser localStorage (key: `bw_sessions`). View them in the "Session History" section below the main app.

### Data Structure

```json
{
  "id": "2026-05-14T10:23:00.000Z",
  "rounds": [
    { "round": 1, "holdMs": 87000 },
    { "round": 2, "holdMs": 95000 },
    { "round": 3, "holdMs": 112000 }
  ],
  "completedRounds": 3
}
```

## Configuration

Edit `CONFIG` in `app.js` to customize breathwork and meditation settings. All settings persist via browser localStorage.

**Breathwork:**
- `breathCount`: Number of breaths per cycle (default: 30)
- `breathInMs`: Inhale duration (default: 2000ms)
- `breathOutMs`: Exhale duration (default: 2000ms)
- `breathPauseMs`: Pause between breaths (default: 1000ms)
- `recoveryHoldMs`: Recovery phase duration (default: 15000ms)
- `defaultRounds`: Default number of rounds per session (default: 3)

**Meditation:**
- `meditationDurationMs`: Default meditation duration (default: 600000ms / 10 minutes)
- `meditationIntervalMs`: Interval between bell tones (default: 60000ms / 60 seconds)
- `meditationIntervalEnabled`: Enable/disable interval bells (default: true)

## Browser Compatibility

Works in all modern browsers with Web Audio API support:
- Chrome/Edge 14+
- Firefox 25+
- Safari 14.1+
- Opera 11+

## License

MIT

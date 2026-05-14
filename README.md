# Breathwork Timer

A simple, browser-based app for guided cyclic breathing exercises. Perfect for improving breath control, focus, and relaxation.

## Features

- **Guided Power Breathing**: 30-breath cycles with visual and audio cues
- **Retention Hold**: Track how long you can hold your breath
- **Recovery Breath**: 15-second guided recovery phase
- **Multi-Round Sessions**: Complete 3+ rounds in a single session
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

### Audio Cues

- **Inhale**: Low tone (220 Hz)
- **Exhale**: Mid tone (330 Hz)
- **Hold Start**: Deep gong (110 Hz)
- **Recovery**: Bright chime (440 Hz)
- **Countdown**: Rapid beeps (880 Hz) in final 3 seconds

Mute/unmute anytime with the 🔊 button.

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

Edit `CONFIG` in `app.js` to customize:

- `breathCount`: Number of breaths per cycle (default: 30)
- `breathInMs`: Inhale duration (default: 2000ms)
- `breathOutMs`: Exhale duration (default: 2000ms)
- `breathPauseMs`: Pause between breaths (default: 1000ms)
- `recoveryHoldMs`: Recovery phase duration (default: 15000ms)
- `defaultRounds`: Default number of rounds per session (default: 3)

## Browser Compatibility

Works in all modern browsers with Web Audio API support:
- Chrome/Edge 14+
- Firefox 25+
- Safari 14.1+
- Opera 11+

## License

MIT

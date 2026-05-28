'use strict';

// ───────── Constants ─────────

const VERSION = '1.0.53';

const KEYS = {
  breath: 'respire_breath',
  med: 'respire_med',
  tweaks: 'respire_tweaks',
  history: 'respire_history',
  legacyHistory: 'respire_sessions',
  onboarding: 'respire_onboarding_done',
};

const DEFAULT_BREATH = {
  rounds: 3,
  cycles: 30,
  inhale: 0.7,
  holdIn: 0,
  exhale: 0.7,
  holdOut: 0,
  recovery: 15,
};

const DEFAULT_MED = {
  duration: 10,
  bell: false,
  interval: 60,
};

const DEFAULT_TWEAKS = {
  dark: false,
  sound: true,
  haptics: true,
  vocal: false,
  voiceGender: 'female',
};

const PRESETS = [
  { name: 'Power Breath', rounds: 3, cycles: 30, inhale: 0.7, holdIn: 0, exhale: 0.7, holdOut: 0, recovery: 15 },
  { name: 'Box 4-4-4-4', rounds: 3, cycles: 12, inhale: 4,   holdIn: 4, exhale: 4,   holdOut: 4, recovery: 0  },
  { name: '4-7-8',       rounds: 3, cycles: 8,  inhale: 4,   holdIn: 7, exhale: 8,   holdOut: 0, recovery: 0  },
  { name: 'Tummo',       rounds: 4, cycles: 40, inhale: 1,   holdIn: 0, exhale: 1,   holdOut: 0, recovery: 20 },
];

const ONBOARDING = [
  { eyebrow: 'Welcome to Respire', title: 'Breath as discipline.',
    body: 'A performance breathing app for power, focus, and stillness. Built around the cycle: ventilate, hold, recover.',
    art: 'intro' },
  { eyebrow: 'Practice safely', title: 'Sit. Lie down. Never in water.',
    body: 'Breathwork can cause lightheadedness. Stay seated or lying down. Never practice while driving, swimming, or in a bath.',
    art: 'safety' },
  { eyebrow: 'Your pace', title: 'Tune every dimension.',
    body: 'Cycles per round. Inhale, hold, exhale, hold timings. Recovery length. Start with a preset — make it yours.',
    art: 'pace' },
];

// ───────── DOM helpers ─────────

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'className') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    el.append(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  return el;
}

function clearKids(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function icon(name, size = 22) {
  const span = document.createElement('span');
  span.style.display = 'inline-flex';
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
  return span;
}

const ICON_PATHS = {
  breath:   '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8" stroke-opacity=".55"/><circle cx="12" cy="12" r="11.2" stroke-opacity=".25"/>',
  meditate: '<path d="M12 3v3"/><path d="M12 21c4 0 7-3 7-7 0-2.5-2-4-4-4-1.5 0-3 1-3 3 0-2-1.5-3-3-3-2 0-4 1.5-4 4 0 4 3 7 7 7Z"/><path d="M8 13l-3-2"/><path d="M16 13l3-2"/>',
  history:  '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2l-.4-2.4h-4l-.4 2.4a7 7 0 0 0-2 1.2L5.5 5.9l-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.4h4l.4-2.4a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"/>',
  bell:     '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  moon:     '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
  sun:      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  close:    '<path d="M6 6l12 12M18 6L6 18"/>',
  chevR:    '<path d="M9 6l6 6-6 6"/>',
  chevL:    '<path d="M15 6l-6 6 6 6"/>',
  pause:    '<rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/>',
  play:     '<path d="M7 4L19 12 7 20Z" fill="currentColor" stroke="none"/>',
  check:    '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  trash:    '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>',
  hapt:     '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M12 18h.01"/><path d="M3 8c1 1 1 7 0 8"/><path d="M21 8c-1 1-1 7 0 8"/>',
  voice:    '<path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/><path d="M19 10a7 7 0 0 1-14 0"/><line x1="12" y1="19" x2="12" y2="22"/>',
};

// ───────── Math / format ─────────

const easeInOutSine = (t) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, t))) - 1) / 2;

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function todayLabel() {
  const d = new Date();
  const opts = { weekday: 'long', month: 'short', day: 'numeric' };
  return d.toLocaleDateString(undefined, opts);
}

// ───────── Audio + haptics ─────────

const audio = {
  ctx: null,
  _clips: {},    // gender-key → AudioBuffer, ready to play
  _pending: {},  // gender-key → ArrayBuffer, fetched but not yet decoded
  ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) { this.ctx = new Ctx(); this._decodeClips(); }
    return this.ctx;
  },
  resume() {
    const c = this.ensure();
    if (c && c.state === 'suspended') c.resume();
  },
  tone(freq, dur, type = 'sine', gain = 0.06) {
    if (!state.tweaks.sound) return;
    const c = this.ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  },
  chime() {
    // Prayer-bowl sound: low fundamental + inharmonic partials, long resonant decay
    this.tone(432, 3.0, 'sine', 0.13);
    setTimeout(() => this.tone(1190, 2.4, 'sine', 0.045), 8);
    setTimeout(() => this.tone(2334, 1.8, 'sine', 0.018), 15);
  },
  sweep(freqFrom, freqTo, dur, type = 'sine', gain = 0.06) {
    if (!state.tweaks.sound) return;
    const c = this.ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freqFrom, c.currentTime);
    o.frequency.linearRampToValueAtTime(freqTo, c.currentTime + dur);
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  },
  phaseTone(phase) {
    switch (phase) {
      case 'inhale':  this.sweep(220, 440, 0.28, 'sine', 0.06); break;
      case 'exhale':  this.sweep(400, 200, 0.32, 'sine', 0.06); break;
      case 'holdIn':
      case 'holdOut': this.tone(110, 0.24, 'sine', 0.06); break;
      case 'recovery':this.tone(440, 0.35, 'sine', 0.06); break;
      case 'countdown':this.tone(880, 0.09, 'square', 0.04); break;
    }
  },

  loadClips() {
    const keys = ['breathe-in', 'and-out', 'hold', 'hold-breath', 'recovery'];
    for (const gender of ['female', 'male']) {
      for (const k of keys) {
        const name = `${gender}-${k}`;
        fetch(`audio/${name}.mp3`)
          .then(r => r.arrayBuffer())
          .then(buf => {
            if (this.ctx) {
              this.ctx.decodeAudioData(buf).then(d => { this._clips[name] = d; }).catch(() => {});
            } else {
              this._pending[name] = buf;
            }
          })
          .catch(() => {});
      }
    }
  },
  _decodeClips() {
    const c = this.ctx;
    if (!c) return;
    for (const [name, buf] of Object.entries(this._pending)) {
      c.decodeAudioData(buf).then(d => { this._clips[name] = d; }).catch(() => {});
    }
    this._pending = {};
  },
  _playClip(name) {
    const c = this.ctx;
    const buf = this._clips[name];
    if (!c || !buf) return false;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = 0.85;
    src.connect(g).connect(c.destination);
    src.start();
    return true;
  },

  _voices: [],
  initVoices() {
    const ss = window.speechSynthesis;
    if (!ss) return;
    const load = () => { this._voices = ss.getVoices(); };
    load();
    ss.onvoiceschanged = load;
  },
  _pickVoice(gender) {
    if (!this._voices.length) return null;
    const femaleHints = /zira|samantha|victoria|karen|moira|fiona|tessa|anna|kate|susan|alice|amelie|ioana|female/i;
    const maleHints   = /david|mark|daniel|alex|jorge|rishi|male/i;
    const hints = gender === 'female' ? femaleHints : maleHints;
    return this._voices.find(v => hints.test(v.name)) || this._voices[0];
  },
  speak(text) {
    if (!state.tweaks.vocal) return;
    const CLIP_MAP = {
      'Breathe in':       'breathe-in',
      'And out':          'and-out',
      'Hold':             'hold',
      'Hold your breath': 'hold-breath',
      'Recovery':         'recovery',
    };
    const k = CLIP_MAP[text];
    if (k) {
      const gender = state.tweaks.voiceGender === 'male' ? 'male' : 'female';
      if (this._playClip(`${gender}-${k}`)) return;
    }
    // Fallback: speechSynthesis (used before clips load, or offline first-visit)
    const ss = window.speechSynthesis;
    if (!ss) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.88;
    u.pitch = state.tweaks.voiceGender === 'female' ? 1.1 : 0.8;
    u.volume = 0.9;
    const v = this._pickVoice(state.tweaks.voiceGender);
    if (v) u.voice = v;
    ss.cancel();
    setTimeout(() => ss.speak(u), 20);
  },
};

function haptic(pattern) {
  if (!state.tweaks.haptics) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}

// ───────── Wake Lock ─────────

const wakeLock = {
  _sentinel: null,
  _onVisible: null,
  async acquire() {
    if (!navigator.wakeLock) return;
    try {
      this._sentinel = await navigator.wakeLock.request('screen');
      this._sentinel.addEventListener('release', () => { this._sentinel = null; });
    } catch (e) {}
    // Re-acquire if the OS releases it when tab becomes visible again
    if (!this._onVisible) {
      this._onVisible = () => { if (document.visibilityState === 'visible') this.acquire(); };
      document.addEventListener('visibilitychange', this._onVisible);
    }
  },
  release() {
    if (this._sentinel) { this._sentinel.release(); this._sentinel = null; }
    if (this._onVisible) {
      document.removeEventListener('visibilitychange', this._onVisible);
      this._onVisible = null;
    }
  },
};

// ───────── Persistence ─────────

function loadJSON(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    return s ? { ...fallback, ...JSON.parse(s) } : { ...fallback };
  } catch (e) {
    return { ...fallback };
  }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

function loadHistory() {
  try {
    const cur = localStorage.getItem(KEYS.history);
    if (cur) return JSON.parse(cur);
  } catch (e) {}
  // Migrate from legacy respire_sessions
  try {
    const legacy = localStorage.getItem(KEYS.legacyHistory);
    if (legacy) {
      const arr = JSON.parse(legacy);
      const migrated = Array.isArray(arr)
        ? arr.map(s => ({ kind: 'breath', date: s.date || new Date().toISOString(), rounds: s.rounds || 0, best: s.best || 0, total: s.total || 0 }))
        : [];
      saveJSON(KEYS.history, migrated);
      return migrated;
    }
  } catch (e) {}
  return [];
}

function saveHistory(h) { saveJSON(KEYS.history, h); }
function saveBreath()  { saveJSON(KEYS.breath, state.breath); }
function saveMed()     { saveJSON(KEYS.med, state.med); }
function saveTweaks()  { saveJSON(KEYS.tweaks, state.tweaks); }

// ───────── App state ─────────

const state = {
  screen: 'onboarding',
  tab: 'home',
  mode: 'breath',
  breath: { ...DEFAULT_BREATH },
  med: { ...DEFAULT_MED },
  tweaks: { ...DEFAULT_TWEAKS },
  history: [],
  advancedOpen: false,
  result: null,
  _toastTimer: null,
  _toastText: '',
  _session: null,
};

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.tweaks.dark ? 'dark' : 'light');
}

function showToast(text) {
  state._toastText = text;
  if (state._toastTimer) clearTimeout(state._toastTimer);
  state._toastTimer = setTimeout(() => { state._toastText = ''; updateToast(); }, 2200);
  updateToast();
}

// ───────── Components ─────────

function brandMark() {
  const span = h('span', { className: 'brand' });
  span.innerHTML = `
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="var(--coral)" stroke-width="1.2" opacity="0.45"/>
      <circle cx="16" cy="16" r="9" stroke="var(--coral)" stroke-width="1.5" opacity="0.75"/>
      <circle cx="16" cy="16" r="4.5" fill="var(--coral)"/>
    </svg>
    Respire
  `;
  return span;
}

function segmented(value, options, onChange) {
  return h('div', { className: 'segmented' },
    options.map(o =>
      h('button', {
        'aria-selected': value === o.value ? 'true' : 'false',
        onclick: () => onChange(o.value),
      }, o.label)
    )
  );
}

function stepper(value, min, max, onChange, suffix) {
  return h('div', { className: 'stepper' },
    h('button', {
      onclick: () => onChange(Math.max(min, value - 1)),
      disabled: value <= min,
    }, '−'),
    h('div', { className: 'val' },
      String(value),
      suffix ? h('span', { style: { fontSize: '12px', marginLeft: '4px', color: 'var(--ink-mute)' } }, suffix) : null
    ),
    h('button', {
      onclick: () => onChange(Math.min(max, value + 1)),
      disabled: value >= max,
    }, '+')
  );
}

function switchEl(value, onChange) {
  return h('div', {
    className: 'switch',
    dataset: { on: value ? 'true' : 'false' },
    role: 'switch',
    'aria-checked': value ? 'true' : 'false',
    onclick: () => onChange(!value),
  });
}

function slider(label, value, min, max, step, unit, onChange) {
  const valSpan = h('span', { className: 'numeric', style: { fontSize: '14px', fontWeight: '600' } }, `${value}${unit}`);
  return h('div', { className: 'col', style: { gap: '8px', padding: '12px 0' } },
    h('div', { className: 'row', style: { justifyContent: 'space-between' } },
      h('span', { style: { fontSize: '14px', fontWeight: '500' } }, label),
      valSpan,
    ),
    h('input', {
      className: 'range', type: 'range', min, max, step, value,
      oninput: (e) => {
        const v = parseFloat(e.target.value);
        valSpan.textContent = `${v}${unit}`;
        onChange(v);
      },
    }),
    h('div', { className: 'row', style: { justifyContent: 'space-between' } },
      h('span', { className: 'caption' }, `${min}${unit}`),
      h('span', { className: 'caption' }, `${max}${unit}`)
    ),
  );
}

function tabBar() {
  const btn = (key, lbl, iconName) =>
    h('button', {
      'aria-selected': state.tab === key ? 'true' : 'false',
      onclick: () => { state.tab = key; render(); },
    }, icon(iconName, 22), lbl);

  return h('div', { className: 'tabbar' },
    btn('home', 'Home', 'breath'),
    btn('history', 'History', 'history'),
    btn('settings', 'Settings', 'settings'),
  );
}

function header(right) {
  return h('div', { className: 'header' }, brandMark(), right || h('span'));
}

// ───────── Onboarding art ─────────

function onboardingArt(kind) {
  if (kind === 'intro') {
    const wrap = h('div', { className: 'orb-wrap', style: { width: 'min(220px, 32vh)', height: 'min(220px, 32vh)' } });
    wrap.innerHTML = `
      <div class="orb-ring r1" style="transform: scale(1)"></div>
      <div class="orb-ring r2" style="transform: scale(1)"></div>
      <div class="orb-ring r3" style="transform: scale(1)"></div>
    `;
    return wrap;
  }
  if (kind === 'safety') {
    const sv = h('span');
    sv.innerHTML = `
      <svg viewBox="0 0 220 220" style="width: min(180px, 28vh); height: min(180px, 28vh);">
        <defs>
          <linearGradient id="og1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--coral)" stop-opacity="0.9"/>
            <stop offset="1" stop-color="var(--coral-deep)" stop-opacity="0.9"/>
          </linearGradient>
        </defs>
        <path d="M110 18 L188 50 L182 124 C176 162 148 192 110 204 C72 192 44 162 38 124 L32 50 Z" fill="url(#og1)"/>
        <path d="M82 110 l22 22 l38 -46" stroke="var(--bg)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;
    return sv;
  }
  const sv = h('span');
  const rows = ['INHALE', 'HOLD', 'EXHALE', 'RECOVERY'];
  const widths = [60, 30, 90, 140];
  sv.innerHTML = `
    <svg viewBox="0 0 240 200" style="width: min(260px, 36vh); height: auto;">
      <g>
        ${rows.map((label, i) => `
          <g transform="translate(20, ${30 + i * 44})">
            <text x="0" y="-8" fill="var(--ink-mute)" font-size="10" font-weight="600" letter-spacing="2" style="text-transform: uppercase; font-family: var(--ff-sans);">${label}</text>
            <rect x="0" y="0" width="200" height="3" rx="1.5" fill="var(--line-strong)"/>
            <rect x="0" y="0" width="${widths[i]}" height="3" rx="1.5" fill="var(--coral)"/>
            <circle cx="${widths[i]}" cy="1.5" r="7" fill="var(--ink)" stroke="var(--bg)" stroke-width="3"/>
          </g>`).join('')}
      </g>
    </svg>
  `;
  return sv;
}

// ───────── Scenes ─────────

function sceneOnboarding() {
  let i = 0;

  const root = h('div', { className: 'scene', dataset: { active: 'true' } });
  const body = h('div');
  root.append(body);

  const draw = () => {
    clearKids(body);
    const card = ONBOARDING[i];
    const last = i === ONBOARDING.length - 1;

    body.append(
      header(h('button', {
        className: 'btn btn-text',
        onclick: () => finishOnboarding(),
      }, 'Skip')),
      h('div', { className: 'scroll', style: { padding: '0 28px 16px', display: 'flex', flexDirection: 'column' } },
        h('div', { style: { flex: '0 0 auto', padding: '8px 0', display: 'grid', placeItems: 'center' } },
          onboardingArt(card.art)
        ),
        h('div', { className: 'dots' },
          ONBOARDING.map((_, idx) =>
            h('span', { dataset: { active: idx === i ? 'true' : 'false' } })
          )
        ),
        h('div', { className: 'col', style: { alignItems: 'flex-start', gap: '14px', padding: '8px 0 0' } },
          h('div', { className: 'eyebrow' }, card.eyebrow),
          h('h1', { className: 'title-xl' }, card.title),
          h('p', { className: 'body' }, card.body),
        )
      ),
      h('div', { style: { padding: '12px 24px calc(20px + var(--safe-bot))', display: 'flex', gap: '10px', flexShrink: '0' } },
        i > 0
          ? h('button', {
              className: 'btn btn-ghost', 'aria-label': 'Back',
              style: { width: '56px', padding: '0' },
              onclick: () => { i--; draw(); },
            }, icon('chevL', 18))
          : null,
        h('button', {
          className: 'btn btn-primary', style: { flex: '1' },
          onclick: () => {
            if (last) finishOnboarding();
            else { i++; draw(); }
          },
        }, last ? 'Begin' : 'Continue', icon('chevR', 16))
      )
    );
  };

  draw();
  return root;
}

function finishOnboarding() {
  try { localStorage.setItem(KEYS.onboarding, 'true'); } catch (e) {}
  state.screen = 'main';
  render();
}

// ───────── Main scene ─────────

function sceneMain() {
  const root = h('div', { className: 'scene', dataset: { active: 'true' } });

  // Header
  root.append(
    header(
      h('button', {
        className: 'btn btn-icon', 'aria-label': 'Toggle theme',
        onclick: () => {
          state.tweaks.dark = !state.tweaks.dark;
          saveTweaks();
          applyTheme();
          render();
        },
      }, icon(state.tweaks.dark ? 'sun' : 'moon', 18))
    )
  );

  // Body — depends on tab
  if (state.tab === 'home') {
    if (state.mode === 'breath') root.append(breathHomeView());
    else root.append(medHomeView());
  } else if (state.tab === 'history') {
    root.append(historyView());
  } else if (state.tab === 'settings') {
    root.append(settingsView());
  }

  // Tab bar
  root.append(tabBar());

  return root;
}

// ───────── Breath Home ─────────

function breathHomeView() {
  const s = state.breath;
  const cycleS = s.inhale + s.holdIn + s.exhale + s.holdOut;
  const totalSec = Math.round((cycleS * s.cycles + s.recovery + 30) * s.rounds);
  const pattern = `${s.inhale}·${s.holdIn}·${s.exhale}·${s.holdOut}`;

  return h('div', { className: 'scroll', style: { padding: '8px 24px 24px' } },
    segmented(state.mode, [
      { value: 'breath', label: 'Breathwork' },
      { value: 'meditate', label: 'Meditate' },
    ], (v) => { state.mode = v; render(); }),

    h('div', { style: { height: '28px' } }),

    h('div', { className: 'eyebrow' }, todayLabel()),
    h('h1', { className: 'title-xl', style: { margin: '6px 0 0' } },
      'Ready to ',
      h('span', { style: { color: 'var(--coral)' } }, 'ventilate'),
      '.'
    ),
    h('p', { className: 'body', style: { margin: '10px 0 0', maxWidth: '360px' } },
      `${s.rounds} rounds · ${s.cycles} cycles each · ~${fmtTime(totalSec)} total`
    ),

    // Rounds card
    h('div', { className: 'card', style: { marginTop: '22px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' } },
      h('div', { className: 'row', style: { justifyContent: 'space-between' } },
        h('div', { className: 'col', style: { gap: '2px' } },
          h('span', { className: 'eyebrow' }, 'Rounds'),
          h('span', { style: { fontSize: '14px', color: 'var(--ink-soft)' } }, "How many sets you'll do")
        ),
        stepper(s.rounds, 1, 10, (v) => { state.breath.rounds = v; saveBreath(); render(); })
      ),
      h('div', { className: 'divider' }),
      h('div', { className: 'row', style: { justifyContent: 'space-between' } },
        h('div', { className: 'col', style: { gap: '2px' } },
          h('span', { className: 'eyebrow' }, 'Pattern'),
          h('span', { className: 'numeric', style: { fontSize: '14px', color: 'var(--ink-soft)' } },
            `${pattern}s · ${s.cycles}× · ${s.recovery}s recovery`)
        ),
        h('button', {
          className: 'btn btn-text', style: { color: 'var(--coral)' },
          onclick: () => { state.advancedOpen = true; render(); },
        }, 'Customize', icon('chevR', 14))
      )
    ),

    // Cycle preview
    h('div', { className: 'card', style: { marginTop: '14px', padding: '20px 18px' } },
      h('div', { className: 'eyebrow', style: { marginBottom: '12px' } }, 'One cycle'),
      cyclePreview(s)
    ),

    h('div', { style: { height: '24px' } }),

    h('button', {
      className: 'btn btn-coral', style: { width: '100%', height: '62px', fontSize: '18px' },
      onclick: startBreath,
    }, 'Start session'),

    h('p', { className: 'caption', style: { textAlign: 'center', marginTop: '14px' } },
      'Practice seated or lying down. Never in water.')
  );
}

function cyclePreview(s) {
  const parts = [
    { name: 'Inhale', val: s.inhale, color: 'var(--coral)' },
    { name: 'Hold',   val: s.holdIn, color: 'var(--ember)' },
    { name: 'Exhale', val: s.exhale, color: 'var(--moss)' },
    { name: 'Hold',   val: s.holdOut, color: 'var(--ink-mute)' },
  ];
  const sum = parts.reduce((a, p) => a + p.val, 0) || 1;
  const visible = parts.filter(p => p.val > 0);

  return h('div', null,
    h('div', { style: { display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: 'var(--surface-2)', border: '1px solid var(--line)' } },
      visible.map((p, i) =>
        h('div', { style: { flex: String(p.val / sum), background: p.color, borderRight: i < visible.length - 1 ? '2px solid var(--bg)' : 'none' } })
      )
    ),
    h('div', { style: { display: 'flex', marginTop: '12px', gap: '8px' } },
      parts.map((p) =>
        h('div', { className: 'col', style: { flex: '1', gap: '2px' } },
          h('div', { className: 'row', style: { gap: '6px', alignItems: 'center' } },
            h('span', { style: { width: '6px', height: '6px', borderRadius: '3px', background: p.color } }),
            h('span', { className: 'caption', style: { color: 'var(--ink-soft)' } }, p.name),
          ),
          h('span', { className: 'numeric', style: { fontSize: '15px', fontWeight: '500', color: 'var(--ink)' } }, `${p.val}s`)
        )
      )
    )
  );
}

// ───────── Meditation Home ─────────

function medHomeView() {
  const m = state.med;
  const presets = [5, 10, 15, 20, 30];

  // DOM refs updated in-place by sliders so scrolling isn't disrupted
  const durTitle = h('span', { style: { color: 'var(--coral)' } },
    `Stay ${m.duration} ${m.duration === 1 ? 'minute' : 'minutes'}.`);
  const durLabel = h('span', { className: 'numeric', style: { fontSize: '14px', fontWeight: '600' } }, `${m.duration}m`);
  const intervalLabel = h('span', { style: { fontSize: '13px', color: 'var(--ink-soft)' } }, `Chime every ${m.interval}s`);
  let pillBtns = [];

  const onDurationChange = (v) => {
    state.med.duration = v;
    saveMed();
    durTitle.textContent = `Stay ${v} ${v === 1 ? 'minute' : 'minutes'}.`;
    durLabel.textContent = `${v}m`;
    pillBtns.forEach(b => b.setAttribute('aria-selected', +b.dataset.val === v ? 'true' : 'false'));
  };

  pillBtns = presets.map(p =>
    h('button', {
      'aria-selected': m.duration === p ? 'true' : 'false',
      dataset: { val: String(p) },
      onclick: () => onDurationChange(p),
    }, `${p}m`)
  );

  return h('div', { className: 'scroll', style: { padding: '8px 24px 24px' } },
    segmented(state.mode, [
      { value: 'breath', label: 'Breathwork' },
      { value: 'meditate', label: 'Meditate' },
    ], (v) => { state.mode = v; render(); }),

    h('div', { style: { height: '28px' } }),

    h('div', { className: 'eyebrow' }, 'Meditation Timer'),
    h('h1', { className: 'title-xl', style: { margin: '6px 0 0' } }, 'Sit quietly.', h('br'), durTitle),
    h('p', { className: 'body', style: { margin: '10px 0 0', maxWidth: '360px' } },
      'Choose a duration and a bell interval. The timer rings when complete.'),

    h('div', { className: 'card', style: { marginTop: '22px', padding: '18px' } },
      h('div', { className: 'eyebrow', style: { marginBottom: '12px' } }, 'Duration'),
      h('div', { className: 'pill-options' }, ...pillBtns),
      h('div', { className: 'divider', style: { margin: '18px 0' } }),
      h('div', { className: 'col', style: { gap: '8px' } },
        h('div', { className: 'row', style: { justifyContent: 'space-between' } },
          h('span', { style: { fontSize: '14px', fontWeight: '500' } }, 'Custom duration'),
          durLabel,
        ),
        h('input', {
          className: 'range', type: 'range', min: '1', max: '90', step: '1', value: m.duration,
          oninput: (e) => onDurationChange(parseInt(e.target.value, 10)),
        })
      )
    ),

    h('div', { className: 'card', style: { marginTop: '14px', padding: '18px' } },
      h('div', { className: 'row', style: { justifyContent: 'space-between' } },
        h('div', { className: 'col', style: { gap: '2px' } },
          h('span', { className: 'eyebrow' }, 'Interval bell'),
          intervalLabel,
        ),
        switchEl(m.bell, (v) => { state.med.bell = v; saveMed(); render(); })
      ),
      m.bell
        ? h('div', null,
            h('div', { className: 'divider', style: { margin: '14px 0' } }),
            slider('Bell every', m.interval, 15, 300, 15, 's',
              (v) => { state.med.interval = v; saveMed(); intervalLabel.textContent = `Chime every ${v}s`; })
          )
        : null
    ),

    h('div', { style: { height: '24px' } }),

    h('button', {
      className: 'btn btn-coral', style: { width: '100%', height: '62px', fontSize: '18px' },
      onclick: startMed,
    }, 'Start session')
  );
}

// ───────── History ─────────

function historyView() {
  const totalSessions = state.history.length;
  const totalSeconds = state.history.reduce((a, x) => a + (x.total || x.duration || 0), 0);
  const bestHold = state.history.reduce((a, x) => Math.max(a, x.best || 0), 0);

  return h('div', { className: 'scroll', style: { padding: '8px 24px 24px' } },
    h('div', { className: 'eyebrow' }, 'Your practice'),
    h('h1', { className: 'title-xl', style: { margin: '6px 0 22px' } }, 'History'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' } },
      statCard(totalSessions, 'Sessions'),
      statCard(fmtTime(totalSeconds), 'Total time'),
      statCard(fmtTime(bestHold), 'Best hold'),
    ),
    h('div', { className: 'card', style: { marginTop: '16px', padding: '8px 18px' } },
      state.history.length === 0
        ? h('div', { style: { padding: '32px 0', textAlign: 'center' } },
            h('div', { className: 'caption' }, 'No sessions yet.'),
            h('div', { className: 'body', style: { marginTop: '6px' } },
              'Your first breathwork or meditation will appear here.')
          )
        : state.history.map(item => historyRow(item))
    ),
    state.history.length > 0
      ? h('button', {
          className: 'btn btn-text', style: { width: '100%', marginTop: '14px' },
          onclick: () => {
            if (confirm('Clear all history?')) {
              state.history = [];
              saveHistory(state.history);
              showToast('History cleared');
            }
          },
        }, icon('trash', 14), 'Clear history')
      : null
  );
}

function historyRow(item) {
  return h('div', { className: 'history-row' },
    h('div', { className: 'col', style: { gap: '4px' } },
      h('div', { className: 'row', style: { gap: '8px' } },
        h('span', { className: 'chip ' + (item.kind === 'breath' ? 'coral' : '') },
          icon(item.kind === 'breath' ? 'breath' : 'meditate', 12),
          item.kind === 'breath' ? 'Breathwork' : 'Meditation'
        ),
        h('span', { className: 'caption' }, item.date)
      ),
      h('span', { className: 'body', style: { color: 'var(--ink)' } },
        item.kind === 'breath'
          ? `${item.rounds} rounds · best ${fmtTime(item.best)}`
          : `${Math.round((item.duration || 0) / 60)} min sit`)
    ),
    h('span', { className: 'numeric', style: { fontSize: '13px', color: 'var(--ink-mute)' } },
      fmtTime(item.kind === 'breath' ? item.total : item.duration))
  );
}

function statCard(value, label) {
  return h('div', { className: 'card', style: { padding: '14px 12px', textAlign: 'left' } },
    h('div', { className: 'numeric', style: { fontSize: '22px', fontWeight: '600', letterSpacing: '-0.02em' } }, value),
    h('div', { className: 'caption', style: { marginTop: '2px' } }, label)
  );
}

// ───────── Settings ─────────

function settingsView() {
  const t = state.tweaks;

  const row = (iconName, label, meta, value, onChange) =>
    h('div', { className: 'settings-row' },
      h('div', { className: 'col', style: { gap: '2px' } },
        h('div', { className: 'row', style: { gap: '10px' } },
          icon(iconName, 18),
          h('span', { style: { fontSize: '15px', fontWeight: '500' } }, label),
        ),
        h('div', { className: 'meta' }, meta),
      ),
      switchEl(value, onChange)
    );

  return h('div', { className: 'scroll', style: { padding: '8px 24px 24px' } },
    h('div', { className: 'eyebrow' }, 'Configure'),
    h('h1', { className: 'title-xl', style: { margin: '6px 0 22px' } }, 'Settings'),

    h('div', { className: 'card' },
      h('div', { className: 'eyebrow', style: { marginBottom: '8px' } }, 'Appearance'),
      row(t.dark ? 'moon' : 'sun', 'Dark mode', 'Switches to a warm-black theme',
        t.dark, (v) => { state.tweaks.dark = v; saveTweaks(); applyTheme(); render(); })
    ),

    h('div', { className: 'card', style: { marginTop: '14px' } },
      h('div', { className: 'eyebrow', style: { marginBottom: '8px' } }, 'Feedback'),
      row('bell', 'Sound', 'Chimes on phase transitions & bell',
        t.sound, (v) => { state.tweaks.sound = v; saveTweaks(); render(); }),
      row('hapt', 'Haptics', 'Buzz at each inhale, exhale, and hold',
        t.haptics, (v) => { state.tweaks.haptics = v; saveTweaks(); render(); }),
      row('voice', 'Voice guidance', 'Announces inhale, exhale, hold, recovery',
        t.vocal, (v) => { state.tweaks.vocal = v; saveTweaks(); render(); }),
      t.vocal
        ? h('div', null,
            h('div', { className: 'divider', style: { margin: '10px 0' } }),
            h('div', { className: 'row', style: { justifyContent: 'space-between', padding: '4px 0 8px' } },
              h('span', { style: { fontSize: '14px', fontWeight: '500' } }, 'Voice'),
              h('div', { className: 'pill-options', style: { gap: '6px' } },
                ['female', 'male'].map(g =>
                  h('button', {
                    'aria-selected': t.voiceGender === g ? 'true' : 'false',
                    onclick: () => { state.tweaks.voiceGender = g; saveTweaks(); render(); },
                    style: { padding: '6px 14px', fontSize: '13px' },
                  }, g === 'female' ? 'Female' : 'Male')
                )
              )
            )
          )
        : null
    ),

    h('div', { className: 'card', style: { marginTop: '14px' } },
      h('div', { className: 'eyebrow', style: { marginBottom: '8px' } }, 'About'),
      h('div', { className: 'settings-row' },
        h('div', { className: 'col', style: { gap: '2px' } },
          h('span', { style: { fontSize: '15px', fontWeight: '500' } }, 'Reset session history'),
          h('div', { className: 'meta' }, `${state.history.length} entries stored locally`),
        ),
        h('button', { className: 'btn btn-text', style: { color: 'var(--coral)' },
          onclick: () => {
            if (state.history.length === 0) return;
            if (confirm('Clear all history?')) {
              state.history = [];
              saveHistory(state.history);
              showToast('History cleared');
            }
          } }, 'Clear')
      ),
      h('div', { className: 'settings-row' },
        h('div', { className: 'col', style: { gap: '2px' } },
          h('span', { style: { fontSize: '15px', fontWeight: '500' } }, 'Restart onboarding'),
          h('div', { className: 'meta' }, 'Show the intro again'),
        ),
        h('button', { className: 'btn btn-text', style: { color: 'var(--coral)' },
          onclick: () => {
            try { localStorage.removeItem(KEYS.onboarding); } catch (e) {}
            state.screen = 'onboarding';
            render();
          } }, 'Restart')
      )
    ),

    h('p', { className: 'caption', style: { textAlign: 'center', marginTop: '20px', padding: '0 24px' } },
      'Consult a doctor before practicing if you have heart, lung, or pregnancy conditions.'),
    h('p', { className: 'caption', style: { textAlign: 'center', marginTop: '8px', opacity: '0.45' } },
      `v${VERSION}`)
  );
}

// ───────── Advanced sheet ─────────

function buildSheetContents() {
  const s = state.breath;
  return [
    h('div', { className: 'sheet-grabber' }),
    h('div', { className: 'header', style: { padding: '10px 24px 8px' } },
      h('div', { className: 'title-md' }, 'Advanced Options'),
      h('button', { className: 'btn btn-icon',
        onclick: () => { state.advancedOpen = false; render(); },
      }, icon('close', 18))
    ),
    h('div', { className: 'scroll', style: { padding: '0 24px 24px' } },
      h('div', { className: 'eyebrow', style: { paddingTop: '8px', paddingBottom: '4px' } }, 'Presets'),
      h('div', { className: 'pill-options' },
        PRESETS.map(p => {
          const same = p.cycles === s.cycles && p.inhale === s.inhale && p.holdIn === s.holdIn
                    && p.exhale === s.exhale && p.holdOut === s.holdOut;
          return h('button', {
            'aria-selected': same ? 'true' : 'false',
            onclick: () => {
              Object.assign(state.breath, p);
              saveBreath();
              updateSheet();
            },
          }, p.name);
        })
      ),
      h('div', { className: 'divider', style: { margin: '20px 0 4px' } }),

      h('div', { className: 'eyebrow', style: { paddingTop: '12px' } }, 'Round structure'),
      slider('Breathing Cycles', s.cycles, 5, 100, 1, ' cycles',
        (v) => { state.breath.cycles = v; saveBreath(); }),
      slider('Recovery Hold', s.recovery, 5, 60, 1, 's',
        (v) => { state.breath.recovery = v; saveBreath(); }),

      h('div', { className: 'eyebrow', style: { paddingTop: '16px' } }, 'Per-cycle timings'),
      slider('Inhale', s.inhale, 0.2, 8, 0.1, 's',
        (v) => { state.breath.inhale = +v.toFixed(1); saveBreath(); }),
      slider('Hold after inhale', s.holdIn, 0, 10, 0.5, 's',
        (v) => { state.breath.holdIn = +v.toFixed(1); saveBreath(); }),
      slider('Exhale', s.exhale, 0.2, 10, 0.1, 's',
        (v) => { state.breath.exhale = +v.toFixed(1); saveBreath(); }),
      slider('Hold after exhale', s.holdOut, 0, 10, 0.5, 's',
        (v) => { state.breath.holdOut = +v.toFixed(1); saveBreath(); }),
    ),
    h('div', { style: { padding: '12px 24px calc(20px + var(--safe-bot))', display: 'flex', gap: '10px' } },
      h('button', { className: 'btn btn-ghost', style: { flex: '1' },
        onclick: () => {
          Object.assign(state.breath, DEFAULT_BREATH);
          saveBreath();
          updateSheet();
        } }, 'Reset'),
      h('button', { className: 'btn btn-primary', style: { flex: '1.4' },
        onclick: () => { state.advancedOpen = false; render(); } }, 'Save'),
    ),
  ];
}

// ───────── Breath orb (reused as DOM) ─────────

function buildOrbDOM() {
  const wrap = h('div', { className: 'orb-stack' });
  const labelTop = h('div', { className: 'orb-label-top' }, ' ');
  const orbWrap = h('div', { className: 'orb-wrap' });
  orbWrap.innerHTML = `
    <div class="orb-ring r1"></div>
    <div class="orb-ring r2"></div>
    <div class="orb-ring r3"></div>
    <div class="orb-time-overlay"></div>
  `;
  const subBot = h('div', { className: 'orb-sub-bot' }, ' ');
  wrap.append(labelTop, orbWrap, subBot);

  // Cache refs once — avoids querySelector on every draw call
  const timeOverlay = orbWrap.querySelector('.orb-time-overlay');
  const rings = [...orbWrap.querySelectorAll('.orb-ring')];
  const r3 = orbWrap.querySelector('.orb-ring.r3');

  return {
    root: wrap,
    setLabel: (txt) => { labelTop.textContent = txt || ' '; },
    setSub: (txt) => { subBot.textContent = txt || ' '; },
    setTime: (txt) => { timeOverlay.textContent = txt || ''; },
    setScale: (s) => {
      const v = 0.45 + Math.max(0, Math.min(1, s)) * 0.55;
      rings.forEach(el => el.style.transform = `scale(${v})`);
    },
    setDimmed: (b) => {
      if (b) r3.classList.add('dimmed'); else r3.classList.remove('dimmed');
    },
  };
}

// ───────── Breath session ─────────

const PHASE_HAPTIC = { inhale: 15, exhale: 15, holdIn: 8, holdOut: 8, recovery: [30, 60, 30] };
const PHASE_SPEECH = {
  inhale: 'Breathe in', exhale: 'And out',
  holdIn: 'Hold', holdOut: 'Hold',
  retention: 'Hold your breath',
  recovery: 'Recovery',
};

class BreathSession {
  constructor(settings) {
    this.s = settings;
    this.dur = {
      countdown: 3,
      inhale: settings.inhale,
      holdIn: settings.holdIn,
      exhale: settings.exhale,
      holdOut: settings.holdOut,
      recovery: settings.recovery || 0,
    };
    this.phase = 'countdown';
    this.round = 1;
    this.cycle = 1;
    this.paused = false;
    this.pauseAcc = 0;
    this.pauseStart = null;
    this.startTime = performance.now();
    this.t = 0;
    this.retentions = [];
    this.best = 0;
    this.total = 0;
    this.rafId = null;
    this.exited = false;
    this._drawn = {};
    this._actionsKey = null;
    this._retFloor = -1;
    this._retTime = '';
    this._cueFired = false;
  }

  mount() {
    const root = h('div', { className: 'scene', dataset: { active: 'true' } });

    this.counterEl = h('div', { className: 'rounder' }, '');
    this.btnPause = h('button', {
      className: 'btn btn-icon', 'aria-label': 'Pause',
      onclick: () => this.togglePause(),
    }, icon('pause', 16));

    root.append(
      h('div', { className: 'header' },
        h('button', {
          className: 'btn btn-icon', 'aria-label': 'Exit',
          onclick: () => this.exit(),
        }, icon('close', 18)),
        this.counterEl,
        this.btnPause,
      )
    );

    this.orb = buildOrbDOM();
    root.append(h('div', { className: 'viz' }, this.orb.root));

    this.actions = h('div', { style: { padding: '16px 28px 32px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch' } });
    root.append(this.actions);

    this.root = root;
    this.renderActions();
    this.updateCounter();
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
    wakeLock.acquire();
    return root;
  }

  unmount() {
    this.exited = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    wakeLock.release();
  }

  loop(now) {
    if (this.exited) return;
    if (!this.paused) {
      this.t = (now - this.startTime - this.pauseAcc) / 1000;
      this.advance();
      this.draw();
    }
    this.rafId = requestAnimationFrame(this.loop);
  }

  togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseStart = performance.now();
    } else if (this.pauseStart != null) {
      this.pauseAcc += performance.now() - this.pauseStart;
      this.pauseStart = null;
    }
    clearKids(this.btnPause);
    this.btnPause.append(icon(this.paused ? 'play' : 'pause', 16));
    this.draw();
  }

  next(p) {
    this.startTime = performance.now();
    this.pauseAcc = 0;
    this.t = 0;
    this._cueFired = false;
    this.phase = p;
    audio.phaseTone(p);
    if (PHASE_HAPTIC[p]) haptic(PHASE_HAPTIC[p]);
    // Speech for retention/recovery fires immediately (user-triggered, no prior phase to pre-cue from)
    if ((p === 'retention' || p === 'recovery') && PHASE_SPEECH[p]) audio.speak(PHASE_SPEECH[p]);
    this.renderActions();
    this.updateCounter();
  }

  nextCycle() {
    if (this.cycle >= this.s.cycles) {
      this.next('retention');
    } else {
      this.cycle++;
      this.next('inhale');
    }
  }

  _nextPhaseSpeech() {
    switch (this.phase) {
      case 'countdown': return PHASE_SPEECH['inhale'];
      case 'inhale':    return this.s.holdIn > 0 ? PHASE_SPEECH['holdIn'] : PHASE_SPEECH['exhale'];
      case 'holdIn':    return PHASE_SPEECH['exhale'];
      case 'exhale':
        if (this.s.holdOut > 0) return PHASE_SPEECH['holdOut'];
        return this.cycle < this.s.cycles ? PHASE_SPEECH['inhale'] : PHASE_SPEECH['retention'];
      case 'holdOut':
        return this.cycle < this.s.cycles ? PHASE_SPEECH['inhale'] : PHASE_SPEECH['retention'];
      case 'recovery':
        return this.round < this.s.rounds ? PHASE_SPEECH['inhale'] : null;
      default: return null;
    }
  }

  advance() {
    if (this.phase === 'retention' || this.phase === 'done') return;
    const d = this.dur[this.phase];

    // Pre-fire speech cue slightly before the phase transition so it lands on time
    if (!this._cueFired) {
      const cue = this._nextPhaseSpeech();
      if (cue && (d - this.t) <= 0.3) {
        audio.speak(cue);
        this._cueFired = true;
      }
    }

    if (this.t < d) return;
    switch (this.phase) {
      case 'countdown':
        this.next('inhale');
        break;
      case 'inhale':
        if (this.s.holdIn > 0) this.next('holdIn');
        else this.next('exhale');
        break;
      case 'holdIn':
        this.next('exhale');
        break;
      case 'exhale':
        if (this.s.holdOut > 0) this.next('holdOut');
        else this.nextCycle();
        break;
      case 'holdOut':
        this.nextCycle();
        break;
      case 'recovery':
        if (this.round >= this.s.rounds) {
          audio.chime();
          haptic([60, 100, 60]);
          this.phase = 'done';
          this.complete();
        } else {
          audio.chime();
          haptic([30, 60, 30]);
          this.round++;
          this.cycle = 1;
          this.next('inhale');
        }
        break;
    }
  }

  finishRetention() {
    const secs = Math.floor(this.t);
    this.retentions.push(secs);
    this.total += secs;
    if (secs > this.best) this.best = secs;
    audio.tone(523, 0.35, 'sine', 0.06);
    haptic(50);
    if (this.dur.recovery > 0) {
      this.next('recovery');
    } else if (this.round >= this.s.rounds) {
      audio.chime();
      haptic([60, 100, 60]);
      this.phase = 'done';
      this.complete();
    } else {
      this.round++;
      this.cycle = 1;
      this.next('inhale');
    }
  }

  draw() {
    const d = this.dur[this.phase] ?? 1;
    const p = this.phase === 'retention' ? 0 : Math.min(1, this.t / d);
    const remaining = Math.max(0, d - this.t);

    let scale = 0.5, label = '', time = '', sub = ' ', dim = false;

    switch (this.phase) {
      case 'countdown':
        scale = 0.5; label = 'Ready'; time = String(Math.ceil(remaining));
        sub = 'Find a comfortable seat';
        break;
      case 'inhale':
        scale = easeInOutSine(p); label = 'Inhale'; time = '';
        sub = this.paused ? 'Paused — tap play to resume' : 'Follow the orb · breathe through your mouth';
        break;
      case 'holdIn':
        scale = 1; label = 'Hold'; time = String(Math.ceil(remaining)); dim = true;
        sub = this.paused ? 'Paused — tap play to resume' : '';
        break;
      case 'exhale':
        scale = 1 - easeInOutSine(p); label = 'Exhale'; time = '';
        sub = this.paused ? 'Paused — tap play to resume' : '';
        break;
      case 'holdOut':
        scale = 0; label = 'Hold'; time = String(Math.ceil(remaining)); dim = true;
        sub = this.paused ? 'Paused — tap play to resume' : '';
        break;
      case 'retention': {
        scale = 0.15 + 0.05 * Math.sin(this.t * 0.6);
        label = 'Retention';
        const flr = Math.floor(this.t);
        if (flr !== this._retFloor) { this._retFloor = flr; this._retTime = fmtTime(this.t); }
        time = this._retTime;
        sub = 'Tap done when ready';
        break;
      }
      case 'recovery':
        scale = easeInOutSine(Math.min(1, this.t / 2));
        label = 'Recovery'; time = String(Math.ceil(d - this.t));
        sub = 'Inhale & hold';
        break;
    }

    this.orb.setScale(scale);
    const last = this._drawn;
    if (label !== last.label) { this.orb.setLabel(label); last.label = label; }
    if (time  !== last.time)  { this.orb.setTime(time);   last.time  = time;  }
    if (sub   !== last.sub)   { this.orb.setSub(sub);     last.sub   = sub;   }
    if (dim   !== last.dim)   { this.orb.setDimmed(dim);  last.dim   = dim;   }
  }

  updateCounter() {
    let txt = `Round ${this.round} / ${this.s.rounds}`;
    if (this.phase === 'inhale' || this.phase === 'exhale' || this.phase === 'holdIn' || this.phase === 'holdOut') {
      txt = `Round ${this.round} · Cycle ${this.cycle}/${this.s.cycles}`;
    }
    this.counterEl.textContent = txt;
  }

  renderActions() {
    const key = this.phase === 'retention'
      ? `retention-${this.retentions.length}`
      : (this.paused ? 'paused' : 'active');
    if (key === this._actionsKey) return;
    this._actionsKey = key;

    clearKids(this.actions);
    if (this.phase === 'retention') {
      this.actions.append(
        h('button', {
          className: 'btn btn-coral',
          onclick: () => this.finishRetention(),
        }, icon('check', 18), 'Done — I need to breathe'),
        this.retentions.length > 0
          ? h('div', { className: 'caption', style: { textAlign: 'center' } },
              `Previous holds: ${this.retentions.map(fmtTime).join(' · ')}`)
          : null,
      );
    } else {
      this.actions.append(
        h('div', { className: 'caption', style: { textAlign: 'center', letterSpacing: '0.02em' } },
          this.paused ? 'Paused — tap play to resume'
                      : 'Follow the orb · breathe through your mouth')
      );
    }
  }

  exit() {
    this.unmount();
    state._session = null;
    state.screen = 'main';
    render();
  }

  complete() {
    this.unmount();
    state._session = null;
    state.result = {
      kind: 'breath',
      retentions: this.retentions.slice(),
      best: this.best,
      total: this.total,
      rounds: this.retentions.length,
    };
    state.screen = 'complete';
    render();
  }
}

// ───────── Meditation session ─────────

class MedSession {
  constructor(med) {
    this.duration = med.duration * 60;
    this.intervalBell = !!med.bell;
    this.intervalSeconds = med.interval || 60;
    this.startTime = performance.now();
    this.pauseAcc = 0;
    this.pauseStart = null;
    this.paused = false;
    this.lastBell = 0;
    this.t = 0;
    this.rafId = null;
    this.exited = false;
    this._drawn = {};
  }

  mount() {
    const root = h('div', { className: 'scene', dataset: { active: 'true' } });

    this.btnPause = h('button', {
      className: 'btn btn-icon', 'aria-label': 'Pause',
      onclick: () => this.togglePause(),
    }, icon('pause', 16));

    root.append(
      h('div', { className: 'header' },
        h('button', {
          className: 'btn btn-icon', 'aria-label': 'Exit',
          onclick: () => this.exit(),
        }, icon('close', 18)),
        h('div', { className: 'rounder' }, 'Meditating'),
        this.btnPause,
      )
    );

    this.orb = buildOrbDOM();
    root.append(h('div', { className: 'viz' }, this.orb.root));

    this.subText = h('div', { className: 'caption' }, 'Stay with the breath');
    root.append(h('div', { style: { padding: '16px 28px 32px', textAlign: 'center' } }, this.subText));

    this.root = root;
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
    wakeLock.acquire();
    return root;
  }

  unmount() {
    this.exited = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    wakeLock.release();
  }

  togglePause() {
    this.paused = !this.paused;
    if (this.paused) this.pauseStart = performance.now();
    else if (this.pauseStart != null) {
      this.pauseAcc += performance.now() - this.pauseStart;
      this.pauseStart = null;
    }
    clearKids(this.btnPause);
    this.btnPause.append(icon(this.paused ? 'play' : 'pause', 16));
    this.subText.textContent = this.paused ? 'Paused' : 'Stay with the breath';
  }

  loop(now) {
    if (this.exited) return;
    if (!this.paused) {
      this.t = (now - this.startTime - this.pauseAcc) / 1000;
      const remaining = Math.max(0, this.duration - this.t);

      if (this.intervalBell && this.intervalSeconds > 0) {
        if (this.t > 0 && Math.floor(this.t / this.intervalSeconds) > Math.floor(this.lastBell / this.intervalSeconds)) {
          audio.chime();
          haptic(40);
          this.lastBell = this.t;
        }
      }

      const scale = 0.45 + 0.15 * Math.sin(((now / 1000) % 8) * Math.PI / 4);
      this.orb.setScale(Math.max(0, Math.min(1, scale)));
      const dr = this._drawn;
      if (!dr.label) { this.orb.setLabel('Settle'); dr.label = 'Settle'; }
      const timeStr = fmtTime(remaining);
      if (timeStr !== dr.time) { this.orb.setTime(timeStr); dr.time = timeStr; }
      const subStr = this.intervalBell
        ? `Next bell in ${fmtTime(Math.max(0, this.intervalSeconds - (this.t - this.lastBell)))}`
        : 'Eyes soft · breath natural';
      if (subStr !== dr.sub) { this.orb.setSub(subStr); dr.sub = subStr; }

      if (remaining <= 0) {
        audio.chime();
        haptic([60, 100, 60]);
        this.complete();
        return;
      }
    }
    this.rafId = requestAnimationFrame(this.loop);
  }

  exit() {
    this.unmount();
    state._session = null;
    state.screen = 'main';
    render();
  }

  complete() {
    this.unmount();
    state._session = null;
    state.result = { kind: 'meditate', duration: this.duration };
    state.screen = 'complete';
    render();
  }
}

// ───────── Complete screen ─────────

function sceneComplete() {
  const r = state.result || { kind: 'breath', retentions: [], best: 0, total: 0 };

  const orb = h('div', { className: 'orb-wrap', style: { width: '180px', height: '180px' } });
  orb.innerHTML = `
    <div class="orb-ring r1" style="transform: scale(1); opacity: 0.4"></div>
    <div class="orb-ring r2" style="transform: scale(1); opacity: 0.6"></div>
    <div class="orb-ring r3" style="transform: scale(1)"></div>
    <div style="position: absolute; inset: 0; display: grid; place-items: center; z-index: 3; color: #FFFFFF;">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
    </div>
  `;

  const stats = r.kind === 'breath'
    ? h('div', { style: { marginTop: '22px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' } },
        statCard((r.retentions || []).length, 'Rounds'),
        statCard(fmtTime(r.best || 0), 'Best hold'),
        statCard(fmtTime(r.total || 0), 'Total hold'),
      )
    : h('div', { style: { marginTop: '22px', display: 'grid', gridTemplateColumns: '1fr', gap: '8px' } },
        statCard(fmtTime(r.duration || 0), 'Time sat')
      );

  const root = h('div', { className: 'scene', dataset: { active: 'true' } },
    h('div', { className: 'header', style: { paddingTop: '16px' } }, brandMark(), h('span')),
    h('div', { className: 'scroll', style: { padding: '0 28px 24px' } },
      h('div', { className: 'center', style: { padding: '8px 0 28px' } }, orb),
      h('div', { className: 'eyebrow', style: { textAlign: 'center' } }, 'Session complete'),
      h('h1', { className: 'title-xl', style: { textAlign: 'center', margin: '8px 0 6px' } },
        r.kind === 'breath' ? 'Strong work.' : 'Stillness.'),
      h('p', { className: 'body', style: { textAlign: 'center', margin: '0 auto', maxWidth: '320px' } },
        r.kind === 'breath'
          ? 'Sit for a minute. Notice the calm in your chest.'
          : 'Carry this stillness with you for the rest of your day.'),
      stats,
      r.kind === 'breath' && r.retentions && r.retentions.length > 0
        ? h('div', { className: 'card', style: { marginTop: '14px' } },
            h('div', { className: 'eyebrow', style: { marginBottom: '12px' } }, 'Retention by round'),
            retentionChart(r.retentions)
          )
        : null,
    ),
    h('div', { style: { padding: '12px 24px calc(20px + var(--safe-bot))', display: 'flex', gap: '10px' } },
      h('button', { className: 'btn btn-ghost', style: { flex: '1' }, onclick: discardResult }, 'Discard'),
      h('button', { className: 'btn btn-coral', style: { flex: '1.4' }, onclick: saveResult }, 'Save & view logs'),
    ),
  );

  return root;
}

function retentionChart(retentions) {
  const max = Math.max(...retentions, 30);
  return h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '10px', height: '100px', padding: '0 4px' } },
    retentions.map((s, i) =>
      h('div', { className: 'col', style: { flex: '1', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', height: '100%' } },
        h('span', { className: 'numeric', style: { fontSize: '12px', color: 'var(--ink)' } }, fmtTime(s)),
        h('div', { style: {
          width: '100%',
          height: `${(s / max) * 70}px`,
          background: 'linear-gradient(180deg, var(--coral), var(--coral-deep))',
          borderRadius: '6px 6px 2px 2px',
        } }),
        h('span', { className: 'caption', style: { fontSize: '10px' } }, `R${i + 1}`),
      )
    )
  );
}

// ───────── Result actions ─────────

function dateLabel() {
  const d = new Date();
  return 'Today · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function saveResult() {
  const r = state.result;
  if (r) {
    const entry = r.kind === 'breath'
      ? { kind: 'breath', date: dateLabel(), rounds: (r.retentions || []).length, best: r.best, total: r.total }
      : { kind: 'meditate', date: dateLabel(), duration: r.duration };
    state.history = [entry, ...state.history];
    saveHistory(state.history);
  }
  state.result = null;
  state.screen = 'main';
  state.tab = 'history';
  render();
  showToast('Session saved');
}

function discardResult() {
  state.result = null;
  state.screen = 'main';
  render();
}

// ───────── Session entry ─────────

function startBreath() {
  audio.resume();
  state._session = new BreathSession(state.breath);
  state.screen = 'breath-session';
  render();
}

function startMed() {
  audio.resume();
  state._session = new MedSession(state.med);
  state.screen = 'meditate-session';
  render();
}

// ───────── Render ─────────

const shell = document.getElementById('app-shell');

// Sheet and toast are persistent siblings of the scene so CSS transitions fire correctly.
let _currentScene = null;
const _sheetBackdropEl = h('div', { className: 'sheet-backdrop', dataset: { open: 'false' },
  onclick: () => { state.advancedOpen = false; updateSheet(); } });
const _sheetEl = h('div', { className: 'sheet', dataset: { open: 'false' } });
const _toastEl = h('div', { className: 'toast', dataset: { show: 'false' } });

function updateSheet() {
  const open = !!state.advancedOpen;
  _sheetBackdropEl.dataset.open = open ? 'true' : 'false';
  _sheetEl.dataset.open = open ? 'true' : 'false';
  clearKids(_sheetEl);
  if (open) _sheetEl.append(...buildSheetContents());
}

function updateToast() {
  _toastEl.dataset.show = state._toastText ? 'true' : 'false';
  _toastEl.textContent = state._toastText || '';
}

function render() {
  if (!_sheetBackdropEl.parentNode) {
    shell.append(_sheetBackdropEl, _sheetEl, _toastEl);
  }
  if (_currentScene && _currentScene.parentNode) _currentScene.remove();

  if (state.screen === 'onboarding') _currentScene = sceneOnboarding();
  else if (state.screen === 'breath-session') _currentScene = state._session ? state._session.mount() : sceneMain();
  else if (state.screen === 'meditate-session') _currentScene = state._session ? state._session.mount() : sceneMain();
  else if (state.screen === 'complete') _currentScene = sceneComplete();
  else _currentScene = sceneMain();

  shell.insertBefore(_currentScene, _sheetBackdropEl);
  updateSheet();
  updateToast();
}

// ───────── Boot ─────────

function boot() {
  state.breath  = loadJSON(KEYS.breath, DEFAULT_BREATH);
  state.med     = loadJSON(KEYS.med, DEFAULT_MED);
  state.tweaks  = loadJSON(KEYS.tweaks, DEFAULT_TWEAKS);
  state.history = loadHistory();
  applyTheme();
  audio.initVoices();
  audio.loadClips();

  const done = localStorage.getItem(KEYS.onboarding) === 'true';
  state.screen = done ? 'main' : 'onboarding';

  const host = location.hostname;
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    window.respire = { state, render, startBreath, startMed };
  }

  render();
}

boot();

const DEFAULTS = {
  rounds: 3,
  cycles: 30,
  inhale: 0.5,
  holdIn: 0,
  exhale: 0.5,
  holdOut: 0,
  recovery: 15,
  meditationDuration: 10,
  meditationBell: true,
  meditationBellInterval: 60,
  dark: false,
  sound: true,
  haptics: true,
};

const PRESETS = {
  wimhof: { cycles: 30, inhale: 0.5, holdIn: 0, exhale: 0.5, holdOut: 0, recovery: 15, name: 'Wim Hof' },
  box: { cycles: 30, inhale: 4, holdIn: 4, exhale: 4, holdOut: 4, recovery: 15, name: 'Box 4-4-4-4' },
  breathing478: { cycles: 40, inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, recovery: 15, name: '4-7-8' },
  tummo: { cycles: 60, inhale: 1, holdIn: 0, exhale: 0.5, holdOut: 4, recovery: 30, name: 'Tummo' },
};

let CONFIG = { ...DEFAULTS };

function loadConfig() {
  try {
    const saved = localStorage.getItem('respire_config');
    if (saved) CONFIG = { ...DEFAULTS, ...JSON.parse(saved) };
  } catch (e) {
    CONFIG = { ...DEFAULTS };
  }
}

function saveConfig() {
  localStorage.setItem('respire_config', JSON.stringify(CONFIG));
}

function loadSessions() {
  try {
    const saved = localStorage.getItem('respire_sessions');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem('respire_sessions', JSON.stringify(sessions));
}

loadConfig();

if (CONFIG.dark) {
  document.documentElement.setAttribute('data-theme', 'dark');
}

class AudioManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.isMuted = !CONFIG.sound;
  }

  resume() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(freq, ms, type = 'sine', vol = 0.3) {
    if (this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + ms / 1000);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + ms / 1000);
  }

  bell() {
    this.play(528, 600, 'sine', 0.25);
    this.play(396, 600, 'sine', 0.15);
  }
}

const audio = new AudioManager();

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function updateOrbScale(orb, scale) {
  orb.style.transform = `scale(${scale})`;
  const rings = orb.parentElement.querySelectorAll('.orb-ring');
  rings.forEach(r => r.style.transform = `scale(${scale})`);
}

class RespiresApp {
  constructor() {
    this.mode = 'breathwork';
    this.scene = 'onboarding';
    this.currentRound = 0;
    this.currentCycle = 0;
    this.phase = '';
    this.phaseTime = 0;
    this.phaseDuration = 0;
    this.retentions = [];
    this.sessions = loadSessions();
    this.onboardingSlide = 0;
    this.paused = false;
    this.pausedAt = 0;

    this.init();
  }

  init() {
    this.cacheDOM();
    this.attachListeners();
    this.updateStatusBar();
    this.renderOnboarding();
    setInterval(() => this.updateStatusBar(), 1000);
  }

  cacheDOM() {
    this.scenes = document.querySelectorAll('.scene');
    this.tabBtns = document.querySelectorAll('.tabbar-btn');
    this.tabContents = document.querySelectorAll('.tab-content');
    this.segmentedBtns = document.querySelectorAll('.segmented-btn');
  }

  attachListeners() {
    // Onboarding
    document.getElementById('btn-onboarding-next').addEventListener('click', () => this.nextOnboarding());
    document.getElementById('btn-onboarding-prev').addEventListener('click', () => this.prevOnboarding());
    document.getElementById('btn-onboarding-skip').addEventListener('click', () => this.goScene('main'));

    // Mode toggle
    this.segmentedBtns.forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    // Breathwork
    document.getElementById('rounds-minus').addEventListener('click', () => this.adjustRounds(-1));
    document.getElementById('rounds-plus').addEventListener('click', () => this.adjustRounds(1));
    document.getElementById('btn-advanced-open').addEventListener('click', () => this.openSheet());
    document.getElementById('btn-start-breathwork').addEventListener('click', () => this.startBreathwork());

    // Meditation
    document.querySelectorAll('.preset-group .preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.currentTarget.dataset.minutes) {
          document.querySelectorAll('.preset-group .preset-btn').forEach(b => b.removeAttribute('data-active'));
          e.currentTarget.setAttribute('data-active', 'true');
          CONFIG.meditationDuration = parseInt(e.currentTarget.dataset.minutes);
          document.getElementById('meditation-custom-minutes').value = CONFIG.meditationDuration;
        }
      });
    });
    document.getElementById('btn-start-meditation').addEventListener('click', () => this.startMeditation());

    // Meditation bell
    document.getElementById('meditation-bell-toggle').addEventListener('change', (e) => {
      CONFIG.meditationBell = e.target.checked;
    });
    document.getElementById('meditation-bell-interval').addEventListener('change', (e) => {
      CONFIG.meditationBellInterval = parseInt(e.target.value) || 60;
    });

    // Meditation custom
    document.getElementById('meditation-custom-minutes').addEventListener('change', (e) => {
      CONFIG.meditationDuration = parseInt(e.target.value) || 10;
    });

    // Tabs
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.id.replace('tab-btn-', '')));
    });

    // Settings
    document.getElementById('toggle-dark-mode').addEventListener('change', (e) => this.toggleDarkMode(e.target.checked));
    document.getElementById('toggle-sound').addEventListener('change', (e) => {
      CONFIG.sound = e.target.checked;
      audio.isMuted = !e.target.checked;
    });
    document.getElementById('toggle-haptics').addEventListener('change', (e) => {
      CONFIG.haptics = e.target.checked;
    });
    document.getElementById('btn-dark-mode').addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      this.toggleDarkMode(!isDark);
      document.getElementById('toggle-dark-mode').checked = !isDark;
    });
    document.getElementById('btn-mute').addEventListener('click', () => {
      audio.isMuted = !audio.isMuted;
      CONFIG.sound = !audio.isMuted;
      document.getElementById('toggle-sound').checked = !audio.isMuted;
      document.getElementById('btn-mute').classList.toggle('muted');
    });
    document.getElementById('btn-haptic').addEventListener('click', () => {
      CONFIG.haptics = !CONFIG.haptics;
      document.getElementById('toggle-haptics').checked = CONFIG.haptics;
      document.getElementById('btn-haptic').classList.toggle('muted');
    });

    // History
    document.getElementById('btn-clear-history').addEventListener('click', () => {
      if (confirm('Clear all session history?')) {
        this.sessions = [];
        saveSessions([]);
        this.renderHistory();
      }
    });

    // Advanced sheet
    document.getElementById('btn-sheet-close').addEventListener('click', () => this.closeSheet());
    document.getElementById('sheet-backdrop').addEventListener('click', () => this.closeSheet());
    document.getElementById('btn-sheet-save').addEventListener('click', () => this.saveAdvanced());
    document.getElementById('btn-reset-defaults').addEventListener('click', () => this.resetDefaults());

    // Presets
    document.getElementById('btn-preset-wimhof').addEventListener('click', () => this.applyPreset('wimhof'));
    document.getElementById('btn-preset-box').addEventListener('click', () => this.applyPreset('box'));
    document.getElementById('btn-preset-478').addEventListener('click', () => this.applyPreset('breathing478'));
    document.getElementById('btn-preset-tummo').addEventListener('click', () => this.applyPreset('tummo'));

    // Session controls
    document.getElementById('btn-pause-breathing').addEventListener('click', () => this.togglePauseBreathing());
    document.getElementById('btn-stop-meditation').addEventListener('click', () => this.stopMeditation());

    // Complete
    document.getElementById('btn-save-session').addEventListener('click', () => this.completeSession());
    document.getElementById('btn-new-session').addEventListener('click', () => this.goScene('main'));

    // Advanced sliders
    const sliders = {
      'cycles-slider': 'cycles',
      'inhale-slider': 'inhale',
      'holdIn-slider': 'holdIn',
      'exhale-slider': 'exhale',
      'holdOut-slider': 'holdOut',
      'recovery-slider': 'recovery',
    };
    Object.entries(sliders).forEach(([id, key]) => {
      const el = document.getElementById(id);
      el.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        CONFIG[key] = val;
        document.getElementById(`${key}-value`).textContent = (val >= 5) ? val : val.toFixed(1);
        this.updateCyclePreview();
      });
    });

    // Sync settings on load
    document.getElementById('toggle-dark-mode').checked = CONFIG.dark;
    document.getElementById('toggle-sound').checked = CONFIG.sound;
    document.getElementById('toggle-haptics').checked = CONFIG.haptics;
    if (CONFIG.meditationBell) document.getElementById('meditation-bell-toggle').checked = true;
    document.getElementById('meditation-bell-interval').value = CONFIG.meditationBellInterval;

    this.updateCyclePreview();
    this.updateSlidersDisplay();
    this.renderHistory();
  }

  updateStatusBar() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('statusbar-time').textContent = `${h}:${m}`;
  }

  goScene(name) {
    this.scene = name;
    this.scenes.forEach(s => s.removeAttribute('data-active'));
    document.getElementById(`scene-${name}`).setAttribute('data-active', 'true');
  }

  switchTab(name) {
    this.tabBtns.forEach(b => b.removeAttribute('data-active'));
    this.tabContents.forEach(c => c.removeAttribute('data-active'));
    document.getElementById(`tab-btn-${name}`).setAttribute('data-active', 'true');
    document.getElementById(`tab-${name}`).setAttribute('data-active', 'true');
  }

  setMode(m) {
    this.mode = m;
    this.segmentedBtns.forEach(b => b.removeAttribute('data-active'));
    document.getElementById(`mode-${m}`).setAttribute('data-active', 'true');
    document.getElementById('breathwork-home').style.display = m === 'breathwork' ? 'block' : 'none';
    document.getElementById('meditation-home').style.display = m === 'meditate' ? 'block' : 'none';
  }

  renderOnboarding() {
    const slides = document.querySelectorAll('.onboarding-slide');
    slides.forEach((s, i) => s.toggleAttribute('data-active', i === this.onboardingSlide));

    const dots = document.getElementById('onboarding-dots');
    dots.innerHTML = Array(3).fill(0).map((_, i) => `<div class="onboarding-dot" ${i === this.onboardingSlide ? 'data-active="true"' : ''}></div>`).join('');

    const prev = document.getElementById('btn-onboarding-prev');
    const next = document.getElementById('btn-onboarding-next');
    prev.style.display = this.onboardingSlide === 0 ? 'none' : 'block';
    next.textContent = this.onboardingSlide === 2 ? 'Get Started' : 'Next';
  }

  nextOnboarding() {
    if (this.onboardingSlide < 2) {
      this.onboardingSlide++;
      this.renderOnboarding();
    } else {
      this.goScene('main');
    }
  }

  prevOnboarding() {
    if (this.onboardingSlide > 0) {
      this.onboardingSlide--;
      this.renderOnboarding();
    }
  }

  adjustRounds(delta) {
    CONFIG.rounds = Math.max(1, Math.min(10, CONFIG.rounds + delta));
    document.getElementById('rounds-value').textContent = CONFIG.rounds;
  }

  updateCyclePreview() {
    const preview = `Inhale: ${CONFIG.inhale.toFixed(1)}s • Hold: ${CONFIG.holdIn.toFixed(1)}s • Exhale: ${CONFIG.exhale.toFixed(1)}s • Hold: ${CONFIG.holdOut.toFixed(1)}s`;
    document.getElementById('cycle-preview').textContent = preview;
  }

  updateSlidersDisplay() {
    document.getElementById('cycles-slider').value = CONFIG.cycles;
    document.getElementById('inhale-slider').value = CONFIG.inhale;
    document.getElementById('holdIn-slider').value = CONFIG.holdIn;
    document.getElementById('exhale-slider').value = CONFIG.exhale;
    document.getElementById('holdOut-slider').value = CONFIG.holdOut;
    document.getElementById('recovery-slider').value = CONFIG.recovery;

    document.getElementById('cycles-value').textContent = CONFIG.cycles;
    document.getElementById('inhale-value').textContent = CONFIG.inhale.toFixed(1);
    document.getElementById('holdIn-value').textContent = CONFIG.holdIn.toFixed(1);
    document.getElementById('exhale-value').textContent = CONFIG.exhale.toFixed(1);
    document.getElementById('holdOut-value').textContent = CONFIG.holdOut.toFixed(1);
    document.getElementById('recovery-value').textContent = CONFIG.recovery.toFixed(0);
  }

  openSheet() {
    this.updateSlidersDisplay();
    document.getElementById('sheet-advanced').setAttribute('data-active', 'true');
    document.getElementById('sheet-backdrop').setAttribute('data-active', 'true');
    audio.resume();
  }

  closeSheet() {
    document.getElementById('sheet-advanced').removeAttribute('data-active');
    document.getElementById('sheet-backdrop').removeAttribute('data-active');
  }

  saveAdvanced() {
    saveConfig();
    this.closeSheet();
    this.toast('Advanced options saved');
  }

  applyPreset(name) {
    const p = PRESETS[name];
    Object.assign(CONFIG, p);
    this.updateSlidersDisplay();
    this.updateCyclePreview();
    this.toast(`${p.name} applied`);
  }

  resetDefaults() {
    CONFIG = { ...DEFAULTS };
    this.updateSlidersDisplay();
    this.updateCyclePreview();
    this.toast('Reset to defaults');
  }

  toggleDarkMode(isDark) {
    CONFIG.dark = isDark;
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    saveConfig();
  }

  startBreathwork() {
    audio.resume();
    this.currentRound = 0;
    this.retentions = [];
    this.goScene('breathing-session');
    this.nextBreathingRound();
  }

  nextBreathingRound() {
    if (this.currentRound >= CONFIG.rounds) {
      this.finishBreathwork();
      return;
    }

    this.currentRound++;
    this.currentCycle = 0;
    document.getElementById('breathing-round-badge').textContent = `Round ${this.currentRound} of ${CONFIG.rounds}`;

    this.startBreathingCycle();
  }

  startBreathingCycle() {
    this.currentCycle++;
    if (this.currentCycle > CONFIG.cycles) {
      this.goToRetention();
      return;
    }

    this.breathePhase('inhale', CONFIG.inhale * 1000);
  }

  breathePhase(phaseName, durationMs) {
    this.phase = phaseName;
    this.phaseTime = 0;
    this.phaseDuration = durationMs;

    const labels = {
      inhale: 'Inhale',
      holdIn: 'Hold',
      exhale: 'Exhale',
      holdOut: 'Hold',
    };

    document.getElementById('breathing-phase').textContent = labels[phaseName];
    audio.play(528, 80, 'sine', 0.1);

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      let scale;
      if (phaseName === 'inhale') {
        scale = 0.45 + easeInOutSine(progress) * 0.55;
      } else if (phaseName === 'exhale') {
        scale = 1.0 - easeInOutSine(progress) * 0.55;
      } else {
        scale = phaseName === 'holdIn' ? 1.0 : 0.45;
      }

      updateOrbScale(document.getElementById('orb-main'), scale);
      document.getElementById('breathing-time').textContent = (durationMs / 1000 - progress * (durationMs / 1000)).toFixed(1);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const nextPhases = {
          inhale: CONFIG.holdIn > 0 ? 'holdIn' : 'exhale',
          holdIn: 'exhale',
          exhale: CONFIG.holdOut > 0 ? 'holdOut' : 'inhale',
          holdOut: 'inhale',
        };
        const nextDuration = {
          inhale: CONFIG.holdIn * 1000,
          holdIn: CONFIG.exhale * 1000,
          exhale: CONFIG.holdOut * 1000,
          holdOut: CONFIG.inhale * 1000,
        }[nextPhases[phaseName]];

        if (nextPhases[phaseName] === 'inhale') {
          this.startBreathingCycle();
        } else {
          this.breathePhase(nextPhases[phaseName], nextDuration);
        }
      }
    };

    animate();
  }

  goToRetention() {
    this.phase = 'retention';
    document.getElementById('breathing-phase').textContent = 'Retention';
    updateOrbScale(document.getElementById('orb-main'), 0.45);

    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const breathingWave = 0.05 * Math.sin(elapsed * 0.6);
      const scale = 0.15 + breathingWave;
      updateOrbScale(document.getElementById('orb-main'), scale);
      document.getElementById('breathing-time').textContent = elapsed.toFixed(1);

      requestAnimationFrame(animate);
    };

    animate();

    const onRetentionDone = () => {
      cancelAnimationFrame(animate);
      this.retentions.push(Math.floor((Date.now() - startTime) / 1000));
      this.startRecovery();
    };

    document.getElementById('btn-pause-breathing').textContent = 'Done Holding';
    document.getElementById('btn-pause-breathing').onclick = onRetentionDone;
  }

  startRecovery() {
    const recoveryMs = CONFIG.recovery * 1000;
    this.phase = 'recovery';
    document.getElementById('breathing-phase').textContent = 'Recovery Breath';

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / recoveryMs);
      const scale = easeInOutSine(progress);
      updateOrbScale(document.getElementById('orb-main'), scale);
      document.getElementById('breathing-time').textContent = (recoveryMs / 1000 - progress * (recoveryMs / 1000)).toFixed(1);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        document.getElementById('btn-pause-breathing').textContent = 'Pause';
        document.getElementById('btn-pause-breathing').onclick = () => this.togglePauseBreathing();
        this.nextBreathingRound();
      }
    };

    animate();
  }

  finishBreathwork() {
    const best = Math.max(...this.retentions, 0);
    const total = this.retentions.reduce((a, b) => a + b, 0);

    document.getElementById('complete-stats').innerHTML = `
      <div class="stat-box"><div class="stat-label">Total Hold</div><div class="stat-value">${total}s</div></div>
      <div class="stat-box"><div class="stat-label">Best Hold</div><div class="stat-value">${best}s</div></div>
      <div class="stat-box"><div class="stat-label">Rounds</div><div class="stat-value">${CONFIG.rounds}</div></div>
    `;

    this.currentSessionData = {
      date: new Date().toISOString(),
      rounds: CONFIG.rounds,
      best: best,
      total: total,
      cycles: CONFIG.cycles,
    };

    this.goScene('complete');
  }

  togglePauseBreathing() {
    // Placeholder for pause functionality
    this.toast('Pause not yet implemented');
  }

  startMeditation() {
    audio.resume();
    const durationMs = CONFIG.meditationDuration * 60 * 1000;
    const bellIntervalMs = CONFIG.meditationBellInterval * 1000;

    this.goScene('meditation-session');

    const startTime = Date.now();
    let nextBellTime = bellIntervalMs;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, durationMs - elapsed);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);

      document.getElementById('meditation-time').textContent = `${mins}:${String(secs).padStart(2, '0')}`;

      if (CONFIG.meditationBell && elapsed >= nextBellTime && nextBellTime > 0) {
        audio.bell();
        nextBellTime += bellIntervalMs;
        document.getElementById('meditation-phase').textContent = `Next bell in ${CONFIG.meditationBellInterval}s`;
      }

      const nextBell = Math.max(0, (nextBellTime - elapsed) / 1000);
      if (nextBell > 0) {
        document.getElementById('meditation-phase').textContent = `Next bell in ${Math.ceil(nextBell)}s`;
      }

      if (remaining > 0) {
        requestAnimationFrame(animate);
      } else {
        audio.bell();
        audio.bell();
        this.finishMeditation();
      }
    };

    animate();
  }

  finishMeditation() {
    const durationMins = CONFIG.meditationDuration;
    document.getElementById('complete-stats').innerHTML = `
      <div class="stat-box"><div class="stat-label">Duration</div><div class="stat-value">${durationMins}m</div></div>
    `;

    this.currentSessionData = {
      date: new Date().toISOString(),
      type: 'meditation',
      duration: durationMins,
    };

    this.goScene('complete');
  }

  stopMeditation() {
    this.goScene('main');
  }

  completeSession() {
    if (this.currentSessionData) {
      this.sessions.push(this.currentSessionData);
      saveSessions(this.sessions);
      this.renderHistory();
      this.toast('Session saved');
    }
    this.goScene('main');
  }

  renderHistory() {
    if (!this.sessions.length) {
      document.getElementById('history-list').innerHTML = '<p style="text-align: center; color: var(--ink-light); margin-top: 24px;">No sessions yet. Start breathing!</p>';
      document.getElementById('history-stats').innerHTML = '';
      return;
    }

    const totalSessions = this.sessions.length;
    const totalTime = this.sessions.reduce((sum, s) => sum + (s.total || s.duration || 0), 0);
    const bestHold = Math.max(...this.sessions.map(s => s.best || 0));

    document.getElementById('history-stats').innerHTML = `
      <div class="stat-box"><div class="stat-label">Sessions</div><div class="stat-value">${totalSessions}</div></div>
      <div class="stat-box"><div class="stat-label">Total Hold</div><div class="stat-value">${totalTime}s</div></div>
      <div class="stat-box"><div class="stat-label">Best Hold</div><div class="stat-value">${bestHold}s</div></div>
    `;

    const list = this.sessions.map(s => {
      const date = new Date(s.date).toLocaleDateString();
      const best = s.best || s.duration || 0;
      const total = s.total || '';
      return `
        <div class="history-item">
          <div>
            <div class="history-date">${date}</div>
            <div class="history-meta">
              <span class="history-chip">${s.rounds ? `${s.rounds} rounds` : `${s.duration}m meditate`}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 600; color: var(--coral);">${best}${total ? 's / ' + total + 's' : ''}</div>
          </div>
        </div>
      `;
    }).reverse().join('');

    document.getElementById('history-list').innerHTML = list;
  }

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.setAttribute('data-active', 'true');
    setTimeout(() => el.removeAttribute('data-active'), 2200);
  }
}

const app = new RespiresApp();

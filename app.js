const DEFAULT_CONFIG = {
  breathCount: 30,
  breathInMs: 500,
  breathHoldMs: 0,
  breathOutMs: 500,
  breathPauseMs: 0,
  recoveryHoldMs: 15000,
  defaultRounds: 3,
  meditationDurationMs: 600000,
  meditationIntervalMs: 60000,
  meditationIntervalEnabled: true,
};

let CONFIG = { ...DEFAULT_CONFIG };

function loadConfig() {
  try {
    const saved = localStorage.getItem('respire_config');
    if (saved) CONFIG = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch (e) {
    CONFIG = { ...DEFAULT_CONFIG };
  }
}

function saveConfig() {
  localStorage.setItem('respire_config', JSON.stringify(CONFIG));
}

loadConfig();

if (localStorage.getItem('respire_dark') === 'true') {
  document.documentElement.setAttribute('data-theme', 'dark');
}

class AudioManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.isMuted = localStorage.getItem('respire_muted') === 'true';
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
  }
}

const audio = new AudioManager();

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

class BreathingApp {
  constructor() {
    this.state = 'IDLE';
    this.currentRound = 0;
    this.totalRounds = 3;
    this.currentCycle = 0;
    this.holdStartTime = null;
    this.roundHoldTimes = [];
    this.sessionStartTime = null;
    this.timerId = null;
    this.meditationStartTime = null;
    this.meditationDuration = 10;
    this.meditationTimer = null;
    this.isPaused = false;
    this.pausedElapsed = 0;
    this.phaseStartTime = 0;
    this.animationFrameId = null;

    this.initDOM();
    this.attachListeners();
    this.checkOnboarding();
  }

  checkOnboarding() {
    if (!localStorage.getItem('respire_onboarding_done')) {
      this.showOnboarding();
    }
  }

  showOnboarding() {
    this.state = 'ONBOARDING';
    this.dom.stageIdle.classList.add('hidden');
    this.dom.stageOnboarding.classList.remove('hidden');
    this.currentSlide = 0;
    this.renderOnboardingSlide();
  }

  renderOnboardingSlide() {
    const slides = this.dom.stageOnboarding.querySelectorAll('.onboarding-slide');
    slides.forEach((s, i) => {
      if (i === this.currentSlide) {
        s.style.display = 'flex';
      } else {
        s.style.display = 'none';
      }
    });

    const prevBtn = this.dom.stageOnboarding.querySelector('.onboarding-prev-btn');
    const nextBtn = this.dom.stageOnboarding.querySelector('.onboarding-next-btn');
    const skipBtn = this.dom.stageOnboarding.querySelector('.onboarding-skip-btn');

    if (prevBtn) prevBtn.style.display = this.currentSlide > 0 ? 'block' : 'none';
    if (nextBtn) nextBtn.textContent = this.currentSlide === 2 ? 'Get Started' : 'Next';
  }

  nextOnboardingSlide() {
    if (this.currentSlide < 2) {
      this.currentSlide++;
      this.renderOnboardingSlide();
    } else {
      this.finishOnboarding();
    }
  }

  prevOnboardingSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.renderOnboardingSlide();
    }
  }

  finishOnboarding() {
    localStorage.setItem('respire_onboarding_done', 'true');
    this.state = 'IDLE';
    this.dom.stageOnboarding.classList.add('hidden');
    this.dom.stageIdle.classList.remove('hidden');
  }

  createOnboardingStage() {
    const existing = document.querySelector('[data-stage="onboarding"]');
    if (existing) return existing;
    return document.createElement('div');
  }

  initDOM() {
    this.dom = {
      stageOnboarding: document.querySelector('[data-stage="onboarding"]') || this.createOnboardingStage(),
      stageIdle: document.getElementById('stage-idle'),
      stageBreathe: document.getElementById('stage-breathing'),
      stageHold: document.getElementById('stage-hold'),
      stageRecovery: document.getElementById('stage-recovery'),
      stageComplete: document.getElementById('stage-complete'),
      stageMeditation: document.getElementById('stage-meditation'),
      roundBadge: document.getElementById('round-badge'),
      holdRoundBadge: document.getElementById('hold-round-badge'),
      recoveryRoundBadge: document.getElementById('recovery-round-badge'),
      circle: document.getElementById('circle'),
      breathingLabel: document.getElementById('breathing-label'),
      breathCounter: document.getElementById('breath-counter'),
      holdTimer: document.getElementById('hold-timer'),
      recoveryTimer: document.getElementById('recovery-timer'),
      sessionSummary: document.getElementById('session-summary'),
      btnPrimary: document.querySelectorAll('#btn-primary'),
      btnDone: document.getElementById('btn-done'),
      meditationTimer: document.getElementById('meditation-timer'),
      meditationIntervalLabel: document.getElementById('meditation-interval-label'),
      btnStopMeditation: document.getElementById('btn-stop-meditation'),
      roundsInput: document.getElementById('rounds-input'),
      btnAdvanced: document.getElementById('btn-advanced'),
      btnStartMeditation: document.getElementById('btn-start-meditation'),
      modal: document.getElementById('advanced-modal'),
      modalBackdrop: document.getElementById('modal-backdrop'),
      btnModalClose: document.getElementById('btn-modal-close'),
      btnModalSave: document.getElementById('btn-modal-save'),
      btnResetDefaults: document.getElementById('btn-reset-defaults'),
      breathingCyclesInput: document.getElementById('breathing-cycles'),
      inhaleDurationInput: document.getElementById('inhale-duration'),
      holdDurationInput: document.getElementById('hold-duration'),
      exhaleDurationInput: document.getElementById('exhale-duration'),
      pauseDurationInput: document.getElementById('pause-duration'),
      recoveryDurationInput: document.getElementById('recovery-duration'),
      breathingCyclesValue: document.getElementById('breathing-cycles-value'),
      inhaleDurationValue: document.getElementById('inhale-duration-value'),
      holdDurationValue: document.getElementById('hold-duration-value'),
      exhaleDurationValue: document.getElementById('exhale-duration-value'),
      pauseDurationValue: document.getElementById('pause-duration-value'),
      recoveryDurationValue: document.getElementById('recovery-duration-value'),
      btnMute: document.getElementById('btn-mute'),
      btnDarkMode: document.getElementById('btn-dark-mode'),
      btnHaptic: document.getElementById('btn-haptic'),
      logsTbody: document.getElementById('logs-tbody'),
      btnClearLogs: document.getElementById('btn-clear-logs'),
      btnPauseBreathing: document.getElementById('btn-pause-breathe'),
      meditationIntervalToggle: document.getElementById('meditation-interval-toggle'),
      meditationCustomMinutes: document.getElementById('meditation-custom-minutes'),
      btnPresetBox: document.getElementById('btn-preset-box'),
      btnPreset478: document.getElementById('btn-preset-478'),
      tabBreatheBtn: document.querySelector('[data-mode="breathwork"]'),
      tabMeditateBtn: document.querySelector('[data-mode="meditate"]'),
      breathworkConfig: document.getElementById('breathwork-config'),
      meditationConfig: document.getElementById('meditation-config'),
    };
  }

  attachListeners() {
    // Onboarding
    const onboardingNextBtn = document.querySelector('.onboarding-next-btn');
    const onboardingPrevBtn = document.querySelector('.onboarding-prev-btn');
    const onboardingSkipBtn = document.querySelector('.onboarding-skip-btn');

    if (onboardingNextBtn) onboardingNextBtn.addEventListener('click', () => this.nextOnboardingSlide());
    if (onboardingPrevBtn) onboardingPrevBtn.addEventListener('click', () => this.prevOnboardingSlide());
    if (onboardingSkipBtn) onboardingSkipBtn.addEventListener('click', () => this.finishOnboarding());

    this.dom.btnPrimary.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.state === 'IDLE') this.startBreathwork();
      });
    });

    this.dom.btnAdvanced.addEventListener('click', () => this.openModal());
    this.dom.btnModalClose.addEventListener('click', () => this.closeModal());
    this.dom.modalBackdrop.addEventListener('click', () => this.closeModal());
    this.dom.btnModalSave.addEventListener('click', () => this.saveAdvanced());
    this.dom.btnResetDefaults.addEventListener('click', () => this.resetDefaults());

    this.dom.btnMute.addEventListener('click', () => this.toggleMute());
    this.dom.btnDarkMode.addEventListener('click', () => this.toggleDarkMode());
    this.dom.btnHaptic.addEventListener('click', () => this.toggleHaptic());

    this.dom.btnClearLogs.addEventListener('click', () => this.clearLogs());

    this.dom.btnPauseBreathing.addEventListener('click', () => this.togglePauseBreathing());
    this.dom.btnDone.addEventListener('click', () => this.finishHold());

    this.dom.btnStartMeditation.addEventListener('click', () => this.startMeditation());
    this.dom.btnStopMeditation.addEventListener('click', () => this.stopMeditation());

    this.dom.tabBreatheBtn.addEventListener('click', () => this.switchToBreathe());
    this.dom.tabMeditateBtn.addEventListener('click', () => this.switchToMeditate());

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const mins = parseInt(e.target.dataset.minutes);
        this.meditationDuration = mins;
        this.dom.meditationCustomMinutes.value = mins;
      });
    });

    this.dom.meditationCustomMinutes.addEventListener('change', (e) => {
      this.meditationDuration = parseInt(e.target.value) || 10;
    });

    [
      ['breathing-cycles', 'breathCount'],
      ['inhale-duration', 'breathInMs'],
      ['hold-duration', 'breathHoldMs'],
      ['exhale-duration', 'breathOutMs'],
      ['pause-duration', 'breathPauseMs'],
      ['recovery-duration', 'recoveryHoldMs'],
    ].forEach(([inputId, configKey]) => {
      const el = document.getElementById(inputId);
      el.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (inputId !== 'breathing-cycles') val *= 1000;
        CONFIG[configKey] = val;
        const valueEl = document.getElementById(inputId + '-value');
        const displayVal = inputId === 'breathing-cycles' ? val : (val / 1000).toFixed(1);
        valueEl.textContent = displayVal + (inputId === 'breathing-cycles' ? '' : 's');
      });
    });

    this.dom.btnPresetBox.addEventListener('click', () => this.applyPreset('box'));
    this.dom.btnPreset478.addEventListener('click', () => this.applyPreset('478'));

    this.renderLogs();
  }

  switchToBreathe() {
    document.querySelector('[data-mode="breathwork"]').classList.add('active');
    document.querySelector('[data-mode="meditate"]').classList.remove('active');
    this.dom.breathworkConfig.classList.remove('hidden');
    this.dom.meditationConfig.classList.add('hidden');
  }

  switchToMeditate() {
    document.querySelector('[data-mode="meditate"]').classList.add('active');
    document.querySelector('[data-mode="breathwork"]').classList.remove('active');
    this.dom.meditationConfig.classList.remove('hidden');
    this.dom.breathworkConfig.classList.add('hidden');
  }

  showStage(stageEl) {
    document.querySelectorAll('.stage').forEach(s => s.classList.add('hidden'));
    stageEl.classList.remove('hidden');
  }

  startBreathwork() {
    audio.resume();
    this.state = 'BREATHING';
    this.totalRounds = parseInt(this.dom.roundsInput.value) || 3;
    this.currentRound = 1;
    this.currentCycle = 0;
    this.roundHoldTimes = [];
    this.sessionStartTime = Date.now();
    this.showStage(this.dom.stageBreathe);
    this.updateRoundBadge();
    this.breathePhase('inhale');
  }

  breathePhase(phase) {
    const phaseConfigs = {
      inhale: { label: 'INHALE', duration: CONFIG.breathInMs },
      holdIn: { label: 'HOLD', duration: CONFIG.breathHoldMs },
      exhale: { label: 'EXHALE', duration: CONFIG.breathOutMs },
      holdOut: { label: 'HOLD', duration: CONFIG.breathPauseMs },
    };

    const config = phaseConfigs[phase];
    this.dom.breathingLabel.textContent = config.label;
    audio.play(528, 80, 'sine', 0.1);

    this.isPaused = false;
    this.pausedElapsed = 0;
    this.phaseStartTime = Date.now();
    const duration = config.duration;

    const animate = () => {
      if (this.isPaused) {
        this.animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const totalElapsed = Date.now() - this.phaseStartTime - this.pausedElapsed;
      const remaining = Math.max(0, duration - totalElapsed);
      const progress = Math.min(1, totalElapsed / duration);

      let scale;
      if (phase === 'inhale') {
        scale = 0.45 + easeInOutSine(progress) * 0.55;
      } else if (phase === 'exhale') {
        scale = 1.0 - easeInOutSine(progress) * 0.55;
      } else {
        scale = phase === 'holdIn' ? 1.0 : 0.45;
      }

      this.dom.circle.style.transform = `scale(${scale})`;
      this.dom.breathCounter.textContent = `${this.currentCycle}/${CONFIG.breathCount} • ${(remaining / 1000).toFixed(1)}s`;

      if (totalElapsed < duration) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.nextPhase(phase);
      }
    };

    animate();
  }

  nextPhase(phase) {
    const sequence = {
      inhale: CONFIG.breathHoldMs > 0 ? 'holdIn' : 'exhale',
      holdIn: 'exhale',
      exhale: CONFIG.breathPauseMs > 0 ? 'holdOut' : 'inhale',
      holdOut: 'inhale',
    };

    const nextPhase = sequence[phase];

    if (nextPhase === 'inhale') {
      this.currentCycle++;
      if (this.currentCycle > CONFIG.breathCount) {
        this.finishBreathing();
      } else {
        this.breathePhase('inhale');
      }
    } else {
      this.breathePhase(nextPhase);
    }
  }

  finishBreathing() {
    this.state = 'HOLD';
    this.showStage(this.dom.stageHold);
    this.dom.holdRoundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds}`;
    this.dom.btnDone.classList.remove('hidden');
    this.holdStartTime = Date.now();
    this.updateHoldTimer();
  }

  updateHoldTimer() {
    const timer = () => {
      const elapsed = Date.now() - this.holdStartTime;
      const secs = Math.floor(elapsed / 1000);
      const ms = elapsed % 1000;
      this.dom.holdTimer.textContent = `${secs}:${String(Math.floor(ms / 100)).padStart(1, '0')}`;
      this.timerId = requestAnimationFrame(timer);
    };
    timer();
  }

  finishHold() {
    cancelAnimationFrame(this.timerId);
    const holdTime = Date.now() - this.holdStartTime;
    this.roundHoldTimes.push(holdTime);
    this.startRecovery();
  }

  togglePauseBreathing() {
    this.isPaused = !this.isPaused;
    this.dom.btnPauseBreathing.textContent = this.isPaused ? 'Resume' : 'Pause';
    if (this.isPaused) {
      this.pausedAtTime = Date.now();
    } else {
      this.pausedElapsed += Date.now() - this.pausedAtTime;
    }
  }

  startRecovery() {
    this.state = 'RECOVERY';
    this.showStage(this.dom.stageRecovery);
    this.dom.recoveryRoundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds}`;

    const recoveryMs = CONFIG.recoveryHoldMs;
    const startTime = Date.now();

    const timer = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, recoveryMs - elapsed);
      const secs = remaining / 1000;
      this.dom.recoveryTimer.textContent = secs.toFixed(1);

      const progress = Math.min(1, elapsed / recoveryMs);
      const scale = easeInOutSine(progress);
      this.dom.circle.style.transform = `scale(${scale})`;

      if (elapsed < recoveryMs) {
        requestAnimationFrame(timer);
      } else {
        this.currentRound++;
        if (this.currentRound <= this.totalRounds) {
          this.currentCycle = 0;
          this.updateRoundBadge();
          this.showStage(this.dom.stageBreathe);
          this.breathePhase('inhale');
        } else {
          this.finishSession();
        }
      }
    };

    timer();
  }

  updateRoundBadge() {
    this.dom.roundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds}`;
  }

  finishSession() {
    this.state = 'COMPLETE';
    this.showStage(this.dom.stageComplete);

    const bestHold = Math.max(...this.roundHoldTimes);
    const totalHold = this.roundHoldTimes.reduce((a, b) => a + b, 0);

    const summary = this.roundHoldTimes.map((time, i) => {
      const secs = (time / 1000).toFixed(1);
      return `<div class="summary-round"><span class="summary-round-label">Round ${i + 1}</span><span class="summary-round-time">${secs}s</span></div>`;
    }).join('');

    this.dom.sessionSummary.innerHTML = summary;

    const saveBtn = Array.from(this.dom.btnPrimary).find(btn => btn.closest('#stage-complete'));
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSession(bestHold, totalHold), { once: true });
    }
  }

  saveSession(best, total) {
    const session = {
      date: new Date().toISOString(),
      rounds: this.totalRounds,
      best: Math.floor(best / 1000),
      total: Math.floor(total / 1000),
    };

    let sessions = [];
    try {
      sessions = JSON.parse(localStorage.getItem('respire_sessions') || '[]');
    } catch {}
    sessions.push(session);
    localStorage.setItem('respire_sessions', JSON.stringify(sessions));

    this.renderLogs();
    this.state = 'IDLE';
    this.showStage(this.dom.stageIdle);
  }

  startMeditation() {
    audio.resume();
    this.state = 'MEDITATION';
    this.meditationStartTime = Date.now();
    const durationMs = this.meditationDuration * 60 * 1000;

    this.showStage(this.dom.stageMeditation);

    const bellIntervalMs = 60 * 1000;
    let nextBell = bellIntervalMs;

    const timer = () => {
      const elapsed = Date.now() - this.meditationStartTime;
      const remaining = Math.max(0, durationMs - elapsed);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);

      this.dom.meditationTimer.textContent = `${mins}:${String(secs).padStart(2, '0')}`;

      if (this.dom.meditationIntervalToggle.checked && elapsed >= nextBell) {
        audio.bell();
        nextBell += bellIntervalMs;
      }

      if (remaining > 0) {
        this.meditationTimer = requestAnimationFrame(timer);
      } else {
        audio.bell();
        this.state = 'IDLE';
        this.showStage(this.dom.stageIdle);
      }
    };

    timer();
  }

  stopMeditation() {
    if (this.meditationTimer) cancelAnimationFrame(this.meditationTimer);
    this.state = 'IDLE';
    this.showStage(this.dom.stageIdle);
  }

  openModal() {
    this.dom.modal.classList.remove('hidden');
    this.dom.modalBackdrop.classList.remove('hidden');
  }

  closeModal() {
    this.dom.modal.classList.add('hidden');
    this.dom.modalBackdrop.classList.add('hidden');
  }

  saveAdvanced() {
    saveConfig();
    this.closeModal();
  }

  applyPreset(preset) {
    if (preset === 'box') {
      CONFIG.breathInMs = 4000;
      CONFIG.breathHoldMs = 4000;
      CONFIG.breathOutMs = 4000;
      CONFIG.breathPauseMs = 4000;
    } else if (preset === '478') {
      CONFIG.breathInMs = 4000;
      CONFIG.breathHoldMs = 7000;
      CONFIG.breathOutMs = 8000;
      CONFIG.breathPauseMs = 0;
    }
    this.updateSliderDisplays();
  }

  resetDefaults() {
    CONFIG = { ...DEFAULT_CONFIG };
    this.updateSliderDisplays();
  }

  updateSliderDisplays() {
    this.dom.breathingCyclesInput.value = CONFIG.breathCount;
    this.dom.inhaleDurationInput.value = CONFIG.breathInMs / 1000;
    this.dom.holdDurationInput.value = CONFIG.breathHoldMs / 1000;
    this.dom.exhaleDurationInput.value = CONFIG.breathOutMs / 1000;
    this.dom.pauseDurationInput.value = CONFIG.breathPauseMs / 1000;
    this.dom.recoveryDurationInput.value = CONFIG.recoveryHoldMs / 1000;

    this.dom.breathingCyclesValue.textContent = CONFIG.breathCount;
    this.dom.inhaleDurationValue.textContent = (CONFIG.breathInMs / 1000).toFixed(1) + 's';
    this.dom.holdDurationValue.textContent = (CONFIG.breathHoldMs / 1000).toFixed(1) + 's';
    this.dom.exhaleDurationValue.textContent = (CONFIG.breathOutMs / 1000).toFixed(1) + 's';
    this.dom.pauseDurationValue.textContent = (CONFIG.breathPauseMs / 1000).toFixed(1) + 's';
    this.dom.recoveryDurationValue.textContent = (CONFIG.recoveryHoldMs / 1000).toFixed(1) + 's';
  }

  toggleMute() {
    audio.isMuted = !audio.isMuted;
    localStorage.setItem('respire_muted', audio.isMuted);
    this.dom.btnMute.classList.toggle('muted');
  }

  toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('respire_dark', 'false');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('respire_dark', 'true');
    }
  }

  toggleHaptic() {
    this.dom.btnHaptic.classList.toggle('muted');
  }

  renderLogs() {
    let sessions = [];
    try {
      sessions = JSON.parse(localStorage.getItem('respire_sessions') || '[]');
    } catch {}

    if (!sessions.length) {
      this.dom.logsTbody.innerHTML = '<tr><td colspan="3">No sessions yet</td></tr>';
      return;
    }

    const rows = sessions.map(s => {
      const date = new Date(s.date).toLocaleDateString();
      return `<tr><td>${date}</td><td>${s.rounds}</td><td>${s.best}s / ${s.total}s</td></tr>`;
    }).join('');

    this.dom.logsTbody.innerHTML = rows;
  }

  clearLogs() {
    if (confirm('Clear all sessions?')) {
      localStorage.removeItem('respire_sessions');
      this.renderLogs();
    }
  }
}

const app = new BreathingApp();

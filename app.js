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
    const saved = localStorage.getItem('bw_config');
    if (saved) CONFIG = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch (e) {
    CONFIG = { ...DEFAULT_CONFIG };
  }
}

function saveConfig() {
  localStorage.setItem('bw_config', JSON.stringify(CONFIG));
}

loadConfig();

if (localStorage.getItem('bw_dark_mode') === 'true') {
  document.body.classList.add('dark');
}

class AudioManager {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.isMuted = localStorage.getItem('bw_muted') === 'true';
    this.useVocals = localStorage.getItem('bw_use_vocals') === 'true';
    this.speechSynthesis = window.speechSynthesis;
  }

  resume() {
    if (this.audioContext.state === 'suspended') this.audioContext.resume();
  }

  play(frequency, duration, type = 'sine', volume = 0.3) {
    if (this.isMuted) return;
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  speak(text, priority = false) {
    if (this.isMuted || !this.useVocals) return;
    if (priority) this.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    this.speechSynthesis.speak(utterance);
  }

  inhaleSound() {
    if (this.useVocals) this.speak('Inhale');
    else this.play(220, 0.3, 'sine', 0.2);
  }

  exhaleSound() {
    if (this.useVocals) this.speak('Exhale');
    else this.play(330, 0.3, 'sine', 0.2);
  }

  holdStartSound() { this.play(110, 0.8, 'sine', 0.3); }
  recoveryStartSound() { this.play(440, 0.4, 'sine', 0.3); }
  countdownBeep() { this.play(880, 0.1, 'sine', 0.2); }
  meditationIntervalSound() { this.play(528, 2.0, 'sine', 0.25); }
  meditationEndSound() {
    this.play(440, 3.0, 'sine', 0.55);
    setTimeout(() => this.play(880, 2.5, 'sine', 0.4), 50);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('bw_muted', this.isMuted);
    return this.isMuted;
  }

  toggleVocals() {
    this.useVocals = !this.useVocals;
    localStorage.setItem('bw_use_vocals', this.useVocals);
    return this.useVocals;
  }
}

class HapticManager {
  constructor() {
    this.supported = typeof navigator.vibrate === 'function';
    this.isEnabled = localStorage.getItem('bw_haptic_enabled') === 'true';
    this.INHALE = [30];
    this.EXHALE = [30, 80, 30];
    this.HOLD_START = [80, 60, 80, 60, 80];
    this.RECOVERY_START = [200];
  }

  vibrate(pattern) {
    if (!this.supported || !this.isEnabled) return;
    navigator.vibrate(pattern);
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    localStorage.setItem('bw_haptic_enabled', this.isEnabled);
    return this.isEnabled;
  }
}

class BreathworkApp {
  constructor() {
    this.audio = new AudioManager();
    this.haptic = new HapticManager();
    this.state = 'IDLE';
    this.currentRound = 1;
    this.totalRounds = CONFIG.defaultRounds;
    this.currentBreath = 0;
    this.holdStartTime = null;
    this.roundHoldTimes = [];
    this.sessionStartTime = new Date();
    this.timerId = null;
    this.meditationStartTime = null;
    this.meditationDuration = CONFIG.meditationDurationMs;
    this.meditationIntervalEnabled = CONFIG.meditationIntervalEnabled;
    this.meditationTimerId = null;
    this.selectedMeditationMinutes = 10;

    this.isPaused = false;
    this.breathTimerIds = [];
    this.breathCurrentPhase = null;
    this.breathPhaseEnteredAt = null;
    this.pausedHoldElapsed = 0;
    this.recoveryEndTime = 0;
    this.recoveryRemainingAtPause = 0;

    this.initDOM();
    this.attachEventListeners();
    this.updateMuteButton();
    this.updateVocalsButton();
    this.updateDarkModeButton();
    this.updateHapticButton();
    this.renderLogs();
  }

  initDOM() {
    this.dom = {
      stageBreathe: document.getElementById('stage-breathing'),
      stageIdle: document.getElementById('stage-idle'),
      stageHold: document.getElementById('stage-hold'),
      stageRecovery: document.getElementById('stage-recovery'),
      stageComplete: document.getElementById('stage-complete'),
      stageMeditation: document.getElementById('stage-meditation'),
      roundBadge: document.getElementById('round-badge'),
      holdRoundBadge: document.getElementById('hold-round-badge'),
      recoveryRoundBadge: document.getElementById('recovery-round-badge'),
      meditationBadge: document.getElementById('meditation-badge'),
      meditationTimer: document.getElementById('meditation-timer'),
      meditationIntervalLabel: document.getElementById('meditation-interval-label'),
      circle: document.getElementById('circle'),
      breathingLabel: document.getElementById('breathing-label'),
      breathCounter: document.getElementById('breath-counter'),
      holdTimer: document.getElementById('hold-timer'),
      recoveryTimer: document.getElementById('recovery-timer'),
      sessionSummary: document.getElementById('session-summary'),
      btnMute: document.getElementById('btn-mute'),
      btnPrimary: document.querySelectorAll('#btn-primary'),
      btnDone: document.getElementById('btn-done'),
      btnStopMeditation: document.getElementById('btn-stop-meditation'),
      btnClearLogs: document.getElementById('btn-clear-logs'),
      logsTable: document.getElementById('logs-table'),
      logsTbody: document.getElementById('logs-tbody'),
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
      btnPresetBox: document.getElementById('btn-preset-box'),
      btnPreset478: document.getElementById('btn-preset-478'),
      breathworkConfig: document.getElementById('breathwork-config'),
      meditationConfig: document.getElementById('meditation-config'),
      meditationIntervalToggle: document.getElementById('meditation-interval-toggle'),
      meditationCustomMinutes: document.getElementById('meditation-custom-minutes'),
      tabBtns: document.querySelectorAll('.tab-btn'),
      presetBtns: document.querySelectorAll('.preset-btn'),
      btnPauseBreathe: document.getElementById('btn-pause-breathe'),
      btnPauseHold: document.getElementById('btn-pause-hold'),
      btnPauseRecovery: document.getElementById('btn-pause-recovery'),
      btnDarkMode: document.getElementById('btn-dark-mode'),
      btnHaptic: document.getElementById('btn-haptic'),
    };
  }

  attachEventListeners() {
    this.dom.btnMute.addEventListener('click', () => this.toggleMute());
    this.dom.btnVocals = document.getElementById('btn-vocals');
    if (this.dom.btnVocals) {
      this.dom.btnVocals.addEventListener('click', () => this.toggleVocals());
    }
    if (this.dom.btnDarkMode) {
      this.dom.btnDarkMode.addEventListener('click', () => this.toggleDarkMode());
    }
    if (this.dom.btnHaptic) {
      this.dom.btnHaptic.addEventListener('click', () => this.toggleHaptic());
    }

    this.dom.btnClearLogs.addEventListener('click', () => this.clearLogs());
    this.dom.roundsInput.addEventListener('change', (e) => {
      this.totalRounds = Math.max(1, parseInt(e.target.value) || CONFIG.defaultRounds);
    });

    this.dom.btnAdvanced.addEventListener('click', () => this.openAdvancedModal());
    this.dom.btnModalClose.addEventListener('click', () => this.closeAdvancedModal());
    this.dom.modalBackdrop.addEventListener('click', () => this.closeAdvancedModal());
    this.dom.btnModalSave.addEventListener('click', () => this.saveAdvancedOptions());
    this.dom.btnResetDefaults.addEventListener('click', () => this.resetToDefaults());

    this.dom.breathingCyclesInput.addEventListener('input', (e) => {
      this.dom.breathingCyclesValue.textContent = e.target.value;
    });
    this.dom.inhaleDurationInput.addEventListener('input', (e) => {
      this.dom.inhaleDurationValue.textContent = (parseInt(e.target.value) / 1000).toFixed(1) + 's';
    });
    this.dom.holdDurationInput.addEventListener('input', (e) => {
      this.dom.holdDurationValue.textContent = (parseInt(e.target.value) / 1000).toFixed(1) + 's';
    });
    this.dom.exhaleDurationInput.addEventListener('input', (e) => {
      this.dom.exhaleDurationValue.textContent = (parseInt(e.target.value) / 1000).toFixed(1) + 's';
    });
    this.dom.pauseDurationInput.addEventListener('input', (e) => {
      this.dom.pauseDurationValue.textContent = (parseInt(e.target.value) / 1000).toFixed(1) + 's';
    });
    this.dom.recoveryDurationInput.addEventListener('input', (e) => {
      this.dom.recoveryDurationValue.textContent = Math.round(parseInt(e.target.value) / 1000) + 's';
    });

    this.dom.btnPresetBox.addEventListener('click', () => this.applyBoxBreathingPreset());
    this.dom.btnPreset478.addEventListener('click', () => this.apply478Preset());

    this.dom.btnPauseBreathe.addEventListener('click', () => this.togglePause());
    this.dom.btnPauseHold.addEventListener('click', () => this.togglePause());
    this.dom.btnPauseRecovery.addEventListener('click', () => this.togglePause());

    this.dom.tabBtns.forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.mode)));
    this.dom.presetBtns.forEach(btn => btn.addEventListener('click', (e) => this.selectPreset(parseInt(e.target.dataset.minutes))));
    this.dom.meditationCustomMinutes.addEventListener('input', (e) => this.selectCustomDuration(parseInt(e.target.value)));

    this.dom.meditationIntervalToggle.addEventListener('change', (e) => {
      CONFIG.meditationIntervalEnabled = e.target.checked;
      saveConfig();
    });

    this.dom.btnStartMeditation.addEventListener('click', () => this.startMeditation());
    this.dom.btnStopMeditation.addEventListener('click', () => this.stopMeditation());

    document.querySelectorAll('button#btn-primary').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.state === 'IDLE') this.startSession();
        else if (this.state === 'HOLD' && btn.id !== 'btn-done') this.startHold();
        else if (this.state === 'COMPLETE') this.saveAndViewLogs();
      });
    });

    this.dom.btnDone.addEventListener('click', () => this.endHold());
  }

  setState(newState) {
    this.isPaused = false;
    this.breathTimerIds.forEach(id => clearTimeout(id));
    this.breathTimerIds = [];
    clearTimeout(this.timerId);
    clearTimeout(this.meditationTimerId);
    this.timerId = null;
    this.dom.circle.classList.remove('paused');
    this.updatePauseButton(false);

    this.hideAllStages();
    this.state = newState;

    switch (newState) {
      case 'IDLE':
        this.dom.stageIdle.classList.remove('hidden');
        this.updateMuteButton();
        break;
      case 'BREATHING':
        this.dom.stageBreathe.classList.remove('hidden');
        this.startBreathingCycle();
        break;
      case 'HOLD':
        this.dom.stageHold.classList.remove('hidden');
        this.dom.btnDone.classList.add('hidden');
        this.dom.btnPauseHold.classList.add('hidden');
        document.querySelector('#stage-hold button#btn-primary').classList.remove('hidden');
        break;
      case 'RECOVERY':
        this.dom.stageRecovery.classList.remove('hidden');
        this.startRecovery();
        break;
      case 'COMPLETE':
        this.dom.stageComplete.classList.remove('hidden');
        this.renderSessionSummary();
        break;
      case 'MEDITATION':
        this.dom.stageMeditation.classList.remove('hidden');
        this.runMeditationTimer();
        break;
    }
  }

  hideAllStages() {
    [
      this.dom.stageIdle,
      this.dom.stageBreathe,
      this.dom.stageHold,
      this.dom.stageRecovery,
      this.dom.stageComplete,
      this.dom.stageMeditation,
    ].forEach((stage) => stage.classList.add('hidden'));
  }

  startSession() {
    this.audio.resume();
    this.currentRound = 1;
    this.roundHoldTimes = [];
    this.sessionStartTime = new Date();
    this.setState('BREATHING');
  }

  startBreathingCycle() {
    this.currentBreath = 0;
    this.cycleBreaths();
  }

  setBreathPhase(phase) {
    this.breathCurrentPhase = phase;
    this.breathPhaseEnteredAt = Date.now();
  }

  addBreathTimer(id) {
    this.breathTimerIds.push(id);
  }

  cycleBreaths() {
    if (this.isPaused) return;
    if (this.currentBreath >= CONFIG.breathCount) {
      this.dom.roundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds} — Ready to Hold`;
      this.setState('HOLD');
      return;
    }

    this.currentBreath++;
    this.dom.breathCounter.textContent = `${this.currentBreath} / ${CONFIG.breathCount}`;
    this.dom.roundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds}`;

    this.setBreathPhase('inhale');
    this.dom.breathingLabel.textContent = 'INHALE';
    this.audio.inhaleSound();
    this.haptic.vibrate(this.haptic.INHALE);
    this.dom.circle.style.transition = `transform ${CONFIG.breathInMs}ms ease-in-out`;
    this.dom.circle.style.transform = 'scale(1.2)';

    if (CONFIG.breathHoldMs > 0) {
      this.addBreathTimer(setTimeout(() => {
        if (!this.isPaused) {
          this.setBreathPhase('breath-hold');
          this.dom.breathingLabel.textContent = 'HOLD';
        }
      }, CONFIG.breathInMs));
    }

    this.addBreathTimer(setTimeout(() => {
      if (!this.isPaused) {
        this.setBreathPhase('exhale');
        this.dom.breathingLabel.textContent = 'EXHALE';
        this.audio.exhaleSound();
        this.haptic.vibrate(this.haptic.EXHALE);
        this.dom.circle.style.transition = `transform ${CONFIG.breathOutMs}ms ease-in-out`;
        this.dom.circle.style.transform = 'scale(0.8)';
      }
    }, CONFIG.breathInMs + CONFIG.breathHoldMs));

    this.addBreathTimer(setTimeout(() => {
      if (!this.isPaused) {
        this.setBreathPhase(null);
        this.cycleBreaths();
      }
    }, CONFIG.breathInMs + CONFIG.breathHoldMs + CONFIG.breathOutMs + CONFIG.breathPauseMs));
  }

  togglePause() {
    if (this.isPaused) this.resumeSession();
    else this.pauseSession();
  }

  pauseSession() {
    this.isPaused = true;

    this.breathTimerIds.forEach(id => clearTimeout(id));
    this.breathTimerIds = [];
    clearTimeout(this.timerId);
    this.timerId = null;

    if (this.state === 'BREATHING') {
      const computed = window.getComputedStyle(this.dom.circle).transform;
      this.dom.circle.style.transition = 'none';
      this.dom.circle.style.transform = computed;
      this.dom.circle.classList.add('paused');
    }

    if (this.state === 'HOLD') {
      this.pausedHoldElapsed = Date.now() - this.holdStartTime;
    }

    if (this.state === 'RECOVERY') {
      this.recoveryRemainingAtPause = Math.max(0, this.recoveryEndTime - Date.now());
    }

    this.updatePauseButton(true);
  }

  resumeSession() {
    this.isPaused = false;
    this.dom.circle.classList.remove('paused');

    if (this.state === 'BREATHING') {
      this.resumeBreathing();
    } else if (this.state === 'HOLD') {
      this.holdStartTime = Date.now() - this.pausedHoldElapsed;
      this.updateHoldTimer();
    } else if (this.state === 'RECOVERY') {
      this.recoveryEndTime = Date.now() + this.recoveryRemainingAtPause;
      this.tickRecovery();
    }

    this.updatePauseButton(false);
  }

  resumeBreathing() {
    if (!this.breathPhaseEnteredAt || !this.breathCurrentPhase) {
      this.cycleBreaths();
      return;
    }

    const elapsed = Date.now() - this.breathPhaseEnteredAt;
    const phase = this.breathCurrentPhase;

    if (phase === 'inhale') {
      const rem = Math.max(50, CONFIG.breathInMs - elapsed);
      this.dom.circle.style.transition = `transform ${rem}ms ease-in-out`;
      this.dom.circle.style.transform = 'scale(1.2)';

      if (CONFIG.breathHoldMs > 0) {
        this.addBreathTimer(setTimeout(() => {
          if (!this.isPaused) { this.setBreathPhase('breath-hold'); this.dom.breathingLabel.textContent = 'HOLD'; }
        }, rem));
      }
      this.addBreathTimer(setTimeout(() => {
        if (!this.isPaused) {
          this.setBreathPhase('exhale');
          this.dom.breathingLabel.textContent = 'EXHALE';
          this.audio.exhaleSound();
          this.haptic.vibrate(this.haptic.EXHALE);
          this.dom.circle.style.transition = `transform ${CONFIG.breathOutMs}ms ease-in-out`;
          this.dom.circle.style.transform = 'scale(0.8)';
        }
      }, rem + CONFIG.breathHoldMs));
      this.addBreathTimer(setTimeout(() => {
        if (!this.isPaused) { this.setBreathPhase(null); this.cycleBreaths(); }
      }, rem + CONFIG.breathHoldMs + CONFIG.breathOutMs + CONFIG.breathPauseMs));

    } else if (phase === 'breath-hold') {
      const rem = Math.max(50, CONFIG.breathHoldMs - elapsed);
      this.addBreathTimer(setTimeout(() => {
        if (!this.isPaused) {
          this.setBreathPhase('exhale');
          this.dom.breathingLabel.textContent = 'EXHALE';
          this.audio.exhaleSound();
          this.haptic.vibrate(this.haptic.EXHALE);
          this.dom.circle.style.transition = `transform ${CONFIG.breathOutMs}ms ease-in-out`;
          this.dom.circle.style.transform = 'scale(0.8)';
        }
      }, rem));
      this.addBreathTimer(setTimeout(() => {
        if (!this.isPaused) { this.setBreathPhase(null); this.cycleBreaths(); }
      }, rem + CONFIG.breathOutMs + CONFIG.breathPauseMs));

    } else if (phase === 'exhale') {
      const rem = Math.max(50, CONFIG.breathOutMs - elapsed);
      this.dom.circle.style.transition = `transform ${rem}ms ease-in-out`;
      this.dom.circle.style.transform = 'scale(0.8)';
      this.addBreathTimer(setTimeout(() => {
        if (!this.isPaused) { this.setBreathPhase(null); this.cycleBreaths(); }
      }, rem + CONFIG.breathPauseMs));

    } else {
      this.cycleBreaths();
    }
  }

  updatePauseButton(isPaused) {
    [this.dom.btnPauseBreathe, this.dom.btnPauseHold, this.dom.btnPauseRecovery].forEach(btn => {
      if (!btn) return;
      btn.textContent = isPaused ? 'Resume' : 'Pause';
      btn.classList.toggle('pause-active', isPaused);
    });
  }

  startHold() {
    this.holdStartTime = Date.now();
    this.dom.btnDone.classList.remove('hidden');
    this.dom.btnPauseHold.classList.remove('hidden');
    document.querySelector('#stage-hold button#btn-primary').classList.add('hidden');
    this.dom.holdRoundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds}`;
    this.audio.holdStartSound();
    this.haptic.vibrate(this.haptic.HOLD_START);
    this.updateHoldTimer();
  }

  updateHoldTimer() {
    if (this.holdStartTime === null) return;

    const elapsed = Math.floor((Date.now() - this.holdStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    this.dom.holdTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    if (this.state === 'HOLD' && !this.isPaused) {
      this.dom.holdTimer.classList.add('pulsing');
      setTimeout(() => this.dom.holdTimer.classList.remove('pulsing'), 500);
      this.timerId = setTimeout(() => this.updateHoldTimer(), 1000);
    }
  }

  endHold() {
    if (!this.holdStartTime) return;
    clearTimeout(this.timerId);
    const holdMs = Date.now() - this.holdStartTime;
    this.roundHoldTimes.push(holdMs);
    this.holdStartTime = null;
    this.setState('RECOVERY');
  }

  startRecovery() {
    this.dom.recoveryRoundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds}`;
    this.audio.recoveryStartSound();
    this.haptic.vibrate(this.haptic.RECOVERY_START);
    this.recoveryEndTime = Date.now() + CONFIG.recoveryHoldMs;
    this.tickRecovery();
  }

  tickRecovery() {
    const remaining = Math.max(0, this.recoveryEndTime - Date.now());
    const totalSecs = remaining / 1000;
    const mins = Math.floor(totalSecs / 60);
    const secs = (totalSecs % 60).toFixed(2);
    this.dom.recoveryTimer.textContent = `${mins}:${secs.padStart(5, '0')}`;

    if (remaining <= 3000 && remaining > 0) {
      this.audio.countdownBeep();
    }

    if (remaining > 0) {
      this.timerId = setTimeout(() => this.tickRecovery(), 100);
    } else {
      this.endRecovery();
    }
  }

  endRecovery() {
    clearTimeout(this.timerId);
    if (this.currentRound < this.totalRounds) {
      this.currentRound++;
      this.setState('BREATHING');
    } else {
      this.setState('COMPLETE');
    }
  }

  formatMs(ms) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  renderSessionSummary() {
    const summary = document.createElement('div');
    this.roundHoldTimes.forEach((holdMs, idx) => {
      const div = document.createElement('div');
      div.className = 'summary-round';
      const label = document.createElement('span');
      label.className = 'summary-round-label';
      label.textContent = `Round ${idx + 1}`;
      const time = document.createElement('span');
      time.className = 'summary-round-time';
      time.textContent = this.formatMs(holdMs);
      div.append(label, time);
      summary.appendChild(div);
    });
    this.dom.sessionSummary.innerHTML = summary.innerHTML;
  }

  saveAndViewLogs() {
    const totalHoldMs = this.roundHoldTimes.reduce((s, t) => s + t, 0);
    const bestHoldMs = this.roundHoldTimes.length > 0 ? Math.max(...this.roundHoldTimes) : 0;
    const session = {
      id: this.sessionStartTime.toISOString(),
      rounds: this.roundHoldTimes.map((holdMs, idx) => ({ round: idx + 1, holdMs })),
      roundCount: this.roundHoldTimes.length,
      totalHoldMs,
      bestHoldMs,
    };

    try {
      const sessions = JSON.parse(localStorage.getItem('bw_sessions') || '[]');
      sessions.unshift(session);
      localStorage.setItem('bw_sessions', JSON.stringify(sessions.slice(0, 50)));
    } catch (e) {
      localStorage.setItem('bw_sessions', JSON.stringify([session]));
    }

    this.renderLogs();
    this.setState('IDLE');
    this.dom.roundsInput.value = CONFIG.defaultRounds;
  }

  renderLogs() {
    let sessions = [];
    try {
      sessions = JSON.parse(localStorage.getItem('bw_sessions') || '[]');
    } catch (e) {
      sessions = [];
    }

    this.dom.logsTbody.innerHTML = '';

    if (sessions.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.className = 'empty-logs';
      td.textContent = 'No sessions yet';
      tr.appendChild(td);
      this.dom.logsTbody.appendChild(tr);
      return;
    }

    const allTimeBest = sessions.reduce((best, s) => {
      const b = s.bestHoldMs != null ? s.bestHoldMs
        : (s.rounds.length > 0 ? Math.max(...s.rounds.map(r => r.holdMs)) : 0);
      return Math.max(best, b);
    }, 0);

    sessions.slice(0, 10).forEach((session) => {
      const date = new Date(session.id);
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' '
        + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const roundCount = session.roundCount != null ? session.roundCount : session.rounds.length;
      const bestHoldMs = session.bestHoldMs != null ? session.bestHoldMs
        : (session.rounds.length > 0 ? Math.max(...session.rounds.map(r => r.holdMs)) : 0);
      const totalHoldMs = session.totalHoldMs != null ? session.totalHoldMs
        : session.rounds.reduce((s, r) => s + r.holdMs, 0);
      const isPB = bestHoldMs > 0 && bestHoldMs === allTimeBest;

      const tr = document.createElement('tr');
      if (isPB) tr.classList.add('pb-row');

      const td1 = document.createElement('td');
      td1.textContent = dateStr;

      const td2 = document.createElement('td');
      td2.textContent = roundCount;

      const td3 = document.createElement('td');
      td3.textContent = this.formatMs(bestHoldMs);
      if (isPB) {
        const badge = document.createElement('span');
        badge.className = 'pb-badge';
        badge.textContent = 'PB';
        td3.appendChild(badge);
      }
      td3.appendChild(document.createTextNode(` / ${this.formatMs(totalHoldMs)}`));

      tr.append(td1, td2, td3);
      this.dom.logsTbody.appendChild(tr);
    });
  }

  clearLogs() {
    if (confirm('Clear all session logs? This cannot be undone.')) {
      localStorage.removeItem('bw_sessions');
      this.renderLogs();
    }
  }

  toggleMute() {
    this.audio.toggleMute();
    this.updateMuteButton();
  }

  updateMuteButton() {
    if (this.audio.isMuted) {
      this.dom.btnMute.textContent = '🔇';
      this.dom.btnMute.classList.add('muted');
    } else {
      this.dom.btnMute.textContent = '🔊';
      this.dom.btnMute.classList.remove('muted');
    }
  }

  toggleVocals() {
    this.audio.toggleVocals();
    this.updateVocalsButton();
  }

  updateVocalsButton() {
    if (!this.dom.btnVocals) return;
    if (this.audio.useVocals) {
      this.dom.btnVocals.textContent = '🎤';
      this.dom.btnVocals.classList.add('active');
    } else {
      this.dom.btnVocals.textContent = '🎵';
      this.dom.btnVocals.classList.remove('active');
    }
  }

  toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('bw_dark_mode', isDark);
    this.updateDarkModeButton();
  }

  updateDarkModeButton() {
    if (!this.dom.btnDarkMode) return;
    const isDark = document.body.classList.contains('dark');
    this.dom.btnDarkMode.textContent = isDark ? '☀️' : '🌙';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#1a1a2e' : '#667eea');
  }

  toggleHaptic() {
    this.haptic.toggle();
    this.updateHapticButton();
  }

  updateHapticButton() {
    if (!this.dom.btnHaptic) return;
    if (!this.haptic.supported) {
      this.dom.btnHaptic.classList.add('haptic-unavailable');
      return;
    }
    if (this.haptic.isEnabled) {
      this.dom.btnHaptic.classList.add('active');
      this.dom.btnHaptic.classList.remove('muted');
    } else {
      this.dom.btnHaptic.classList.remove('active');
      this.dom.btnHaptic.classList.add('muted');
    }
  }

  openAdvancedModal() {
    this.dom.breathingCyclesInput.value = CONFIG.breathCount;
    this.dom.breathingCyclesValue.textContent = CONFIG.breathCount;
    this.dom.inhaleDurationInput.value = CONFIG.breathInMs;
    this.dom.inhaleDurationValue.textContent = (CONFIG.breathInMs / 1000).toFixed(1) + 's';
    this.dom.holdDurationInput.value = CONFIG.breathHoldMs;
    this.dom.holdDurationValue.textContent = (CONFIG.breathHoldMs / 1000).toFixed(1) + 's';
    this.dom.exhaleDurationInput.value = CONFIG.breathOutMs;
    this.dom.exhaleDurationValue.textContent = (CONFIG.breathOutMs / 1000).toFixed(1) + 's';
    this.dom.pauseDurationInput.value = CONFIG.breathPauseMs;
    this.dom.pauseDurationValue.textContent = (CONFIG.breathPauseMs / 1000).toFixed(1) + 's';
    this.dom.recoveryDurationInput.value = CONFIG.recoveryHoldMs;
    this.dom.recoveryDurationValue.textContent = Math.round(CONFIG.recoveryHoldMs / 1000) + 's';

    this.dom.modal.classList.remove('hidden');
    this.dom.modalBackdrop.classList.remove('hidden');
  }

  closeAdvancedModal() {
    this.dom.modal.classList.add('hidden');
    this.dom.modalBackdrop.classList.add('hidden');
  }

  saveAdvancedOptions() {
    CONFIG.breathCount = parseInt(this.dom.breathingCyclesInput.value) || DEFAULT_CONFIG.breathCount;
    CONFIG.breathInMs = parseInt(this.dom.inhaleDurationInput.value) || DEFAULT_CONFIG.breathInMs;
    CONFIG.breathHoldMs = parseInt(this.dom.holdDurationInput.value) || 0;
    CONFIG.breathOutMs = parseInt(this.dom.exhaleDurationInput.value) || DEFAULT_CONFIG.breathOutMs;
    CONFIG.breathPauseMs = parseInt(this.dom.pauseDurationInput.value) || 0;
    CONFIG.recoveryHoldMs = parseInt(this.dom.recoveryDurationInput.value) || DEFAULT_CONFIG.recoveryHoldMs;
    saveConfig();
    this.closeAdvancedModal();
  }

  resetToDefaults() {
    CONFIG = { ...DEFAULT_CONFIG };
    saveConfig();
    this.openAdvancedModal();
  }

  applyBoxBreathingPreset() {
    CONFIG.breathInMs = 4000;
    CONFIG.breathHoldMs = 4000;
    CONFIG.breathOutMs = 4000;
    CONFIG.breathPauseMs = 4000;
    saveConfig();
    this.openAdvancedModal();
  }

  apply478Preset() {
    CONFIG.breathInMs = 4000;
    CONFIG.breathHoldMs = 7000;
    CONFIG.breathOutMs = 8000;
    CONFIG.breathPauseMs = 0;
    saveConfig();
    this.openAdvancedModal();
  }

  switchTab(mode) {
    this.dom.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (mode === 'breathwork') {
      this.dom.breathworkConfig.classList.remove('hidden');
      this.dom.meditationConfig.classList.add('hidden');
    } else {
      this.dom.breathworkConfig.classList.add('hidden');
      this.dom.meditationConfig.classList.remove('hidden');
    }
  }

  selectPreset(minutes) {
    this.selectedMeditationMinutes = minutes;
    this.dom.meditationCustomMinutes.value = minutes;
    this.dom.presetBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.minutes) === minutes);
    });
  }

  selectCustomDuration(minutes) {
    const val = Math.max(1, parseInt(minutes) || 1);
    this.selectedMeditationMinutes = val;
    this.dom.presetBtns.forEach(btn => btn.classList.remove('active'));
  }

  startMeditation() {
    this.audio.resume();
    this.meditationDuration = this.selectedMeditationMinutes * 60000;
    this.meditationStartTime = Date.now();
    this.meditationIntervalEnabled = this.dom.meditationIntervalToggle.checked;
    this.setState('MEDITATION');
  }

  runMeditationTimer() {
    if (this.meditationStartTime === null) return;

    const elapsed = Date.now() - this.meditationStartTime;
    const remaining = this.meditationDuration - elapsed;

    if (remaining <= 0) {
      this.audio.meditationEndSound();
      this.meditationStartTime = null;
      this.setState('IDLE');
      return;
    }

    if (this.meditationIntervalEnabled) {
      const elapsedSecs = Math.floor(elapsed / 1000);
      const prevElapsedSecs = Math.floor((elapsed - 100) / 1000);
      if (elapsedSecs > 0 && elapsedSecs % 60 === 0 && prevElapsedSecs % 60 !== 0) {
        this.audio.meditationIntervalSound();
      }
    }

    const remainingSecs = Math.floor(remaining / 1000);
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;
    this.dom.meditationTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    if (this.meditationIntervalEnabled) {
      const elapsedSecs = Math.floor(elapsed / 1000);
      const nextIntervalSecs = Math.ceil((elapsedSecs + 1) / 60) * 60;
      const secsToNext = nextIntervalSecs - elapsedSecs;
      if (secsToNext <= 60 && secsToNext > 0) {
        const nextMins = Math.floor(secsToNext / 60);
        const nextSecs = secsToNext % 60;
        this.dom.meditationIntervalLabel.textContent = `Next bell in ${nextMins}:${nextSecs.toString().padStart(2, '0')}`;
      }
    } else {
      this.dom.meditationIntervalLabel.textContent = '';
    }

    if (this.state === 'MEDITATION') {
      this.meditationTimerId = setTimeout(() => this.runMeditationTimer(), 100);
    }
  }

  stopMeditation() {
    clearTimeout(this.meditationTimerId);
    this.meditationStartTime = null;
    this.setState('IDLE');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, false);

  document.addEventListener('touchmove', (e) => {
    const stage = document.querySelector('.stage:not(.hidden)');
    if (stage && stage.id !== 'stage-idle') e.preventDefault();
  }, { passive: false });

  document.addEventListener('selectstart', (e) => {
    const stage = document.querySelector('.stage:not(.hidden)');
    if (stage && stage.id !== 'stage-idle') e.preventDefault();
  });

  new BreathworkApp();
});

const DEFAULT_CONFIG = {
  breathCount: 30,
  breathInMs: 2000,
  breathOutMs: 2000,
  breathPauseMs: 1000,
  recoveryHoldMs: 15000,
  defaultRounds: 3,
  meditationDurationMs: 600000,
  meditationIntervalMs: 60000,
  meditationIntervalEnabled: true,
};

let CONFIG = { ...DEFAULT_CONFIG };

function loadConfig() {
  const saved = localStorage.getItem('bw_config');
  if (saved) {
    CONFIG = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  }
}

function saveConfig() {
  localStorage.setItem('bw_config', JSON.stringify(CONFIG));
}

loadConfig();

class AudioManager {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.isMuted = localStorage.getItem('bw_muted') === 'true';
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

  inhaleSound() {
    this.play(220, 0.3, 'sine', 0.2);
  }

  exhaleSound() {
    this.play(330, 0.3, 'sine', 0.2);
  }

  holdStartSound() {
    this.play(110, 0.8, 'sine', 0.3);
  }

  recoveryStartSound() {
    this.play(440, 0.4, 'sine', 0.3);
  }

  countdownBeep() {
    this.play(880, 0.1, 'sine', 0.2);
  }

  meditationIntervalSound() {
    this.play(528, 2.0, 'sine', 0.25);
  }

  meditationEndSound() {
    this.play(440, 3.0, 'sine', 0.55);
    setTimeout(() => this.play(880, 2.5, 'sine', 0.4), 50);
  }

  toggle() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('bw_muted', this.isMuted);
    return this.isMuted;
  }
}

class BreathworkApp {
  constructor() {
    this.audio = new AudioManager();
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

    this.initDOM();
    this.attachEventListeners();
    this.updateMuteButton();
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
      exhaleDurationInput: document.getElementById('exhale-duration'),
      pauseDurationInput: document.getElementById('pause-duration'),
      recoveryDurationInput: document.getElementById('recovery-duration'),
      breathingCyclesValue: document.getElementById('breathing-cycles-value'),
      inhaleDurationValue: document.getElementById('inhale-duration-value'),
      exhaleDurationValue: document.getElementById('exhale-duration-value'),
      pauseDurationValue: document.getElementById('pause-duration-value'),
      recoveryDurationValue: document.getElementById('recovery-duration-value'),
      breathworkConfig: document.getElementById('breathwork-config'),
      meditationConfig: document.getElementById('meditation-config'),
      meditationIntervalToggle: document.getElementById('meditation-interval-toggle'),
      meditationCustomMinutes: document.getElementById('meditation-custom-minutes'),
      tabBtns: document.querySelectorAll('.tab-btn'),
      presetBtns: document.querySelectorAll('.preset-btn'),
    };
  }

  attachEventListeners() {
    this.dom.btnMute.addEventListener('click', () => this.toggleMute());
    this.dom.btnClearLogs.addEventListener('click', () => this.clearLogs());
    this.dom.roundsInput.addEventListener('change', (e) => {
      this.totalRounds = parseInt(e.target.value) || CONFIG.defaultRounds;
    });

    this.dom.btnAdvanced.addEventListener('click', () => this.openAdvancedModal());
    this.dom.btnModalClose.addEventListener('click', () => this.closeAdvancedModal());
    this.dom.modalBackdrop.addEventListener('click', () => this.closeAdvancedModal());
    this.dom.btnModalSave.addEventListener('click', () => this.saveAdvancedOptions());
    this.dom.btnResetDefaults.addEventListener('click', () => this.resetToDefaults());

    // Slider value display updates
    this.dom.breathingCyclesInput.addEventListener('input', (e) => {
      this.dom.breathingCyclesValue.textContent = e.target.value;
    });
    this.dom.inhaleDurationInput.addEventListener('input', (e) => {
      this.dom.inhaleDurationValue.textContent = (parseInt(e.target.value) / 1000).toFixed(1) + 's';
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

    // Tab switching
    this.dom.tabBtns.forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.mode)));

    // Preset meditation duration buttons
    this.dom.presetBtns.forEach(btn => btn.addEventListener('click', (e) => this.selectPreset(parseInt(e.target.dataset.minutes))));

    // Custom meditation duration input
    this.dom.meditationCustomMinutes.addEventListener('input', (e) => this.selectCustomDuration(parseInt(e.target.value)));

    // Interval toggle
    this.dom.meditationIntervalToggle.addEventListener('change', (e) => {
      CONFIG.meditationIntervalEnabled = e.target.checked;
      saveConfig();
    });

    // Meditation start / stop
    this.dom.btnStartMeditation.addEventListener('click', () => this.startMeditation());
    this.dom.btnStopMeditation.addEventListener('click', () => this.stopMeditation());

    document.querySelectorAll('button#btn-primary').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (this.state === 'IDLE') this.startSession();
        else if (this.state === 'HOLD' && btn.id !== 'btn-done') this.startHold();
        else if (this.state === 'COMPLETE') this.saveAndViewLogs();
      });
    });

    this.dom.btnDone.addEventListener('click', () => this.endHold());
  }

  setState(newState) {
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
    this.currentRound = 1;
    this.roundHoldTimes = [];
    this.sessionStartTime = new Date();
    this.setState('BREATHING');
  }

  startBreathingCycle() {
    this.currentBreath = 0;
    this.cycleBreaths();
  }

  cycleBreaths() {
    if (this.currentBreath >= CONFIG.breathCount) {
      this.dom.roundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds} — Ready to Hold`;
      this.setState('HOLD');
      return;
    }

    this.currentBreath++;
    this.dom.breathCounter.textContent = `${this.currentBreath} / ${CONFIG.breathCount}`;
    this.dom.roundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds}`;

    this.dom.breathingLabel.textContent = 'INHALE';
    this.audio.inhaleSound();
    this.dom.circle.style.animation = 'none';
    setTimeout(() => {
      this.dom.circle.style.animation = '';
    }, 10);

    setTimeout(() => {
      this.dom.breathingLabel.textContent = 'EXHALE';
      this.audio.exhaleSound();
    }, CONFIG.breathInMs);

    setTimeout(() => {
      this.cycleBreaths();
    }, CONFIG.breathInMs + CONFIG.breathOutMs + CONFIG.breathPauseMs);
  }

  startHold() {
    this.holdStartTime = Date.now();
    this.dom.btnDone.classList.remove('hidden');
    document.querySelector('#stage-hold button#btn-primary').classList.add('hidden');
    this.dom.holdRoundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds}`;
    this.audio.holdStartSound();
    this.updateHoldTimer();
  }

  updateHoldTimer() {
    if (this.holdStartTime === null) return;

    const elapsed = Math.floor((Date.now() - this.holdStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    this.dom.holdTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    if (this.state === 'HOLD') {
      this.dom.holdTimer.classList.add('pulsing');
      setTimeout(() => {
        this.dom.holdTimer.classList.remove('pulsing');
      }, 500);
      this.timerId = setTimeout(() => this.updateHoldTimer(), 1000);
    }
  }

  endHold() {
    clearTimeout(this.timerId);
    const holdMs = Date.now() - this.holdStartTime;
    this.roundHoldTimes.push(holdMs);
    this.holdStartTime = null;

    if (this.currentRound < this.totalRounds) {
      this.currentRound++;
      this.setState('RECOVERY');
    } else {
      this.setState('RECOVERY');
    }
  }

  startRecovery() {
    this.dom.recoveryRoundBadge.textContent = `Round ${this.currentRound} of ${this.totalRounds}`;
    this.audio.recoveryStartSound();

    let remaining = CONFIG.recoveryHoldMs;
    const updateTimer = () => {
      remaining -= 100;
      const secs = (remaining / 1000).toFixed(2);
      this.dom.recoveryTimer.textContent = `0:${secs.padStart(5, '0')}`;

      if (remaining <= 3000 && remaining > 0) {
        this.audio.countdownBeep();
      }

      if (remaining > 0) {
        this.timerId = setTimeout(updateTimer, 100);
      } else {
        this.endRecovery();
      }
    };

    updateTimer();
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

  renderSessionSummary() {
    const summary = document.createElement('div');
    this.roundHoldTimes.forEach((holdMs, idx) => {
      const mins = Math.floor(holdMs / 60000);
      const secs = Math.floor((holdMs % 60000) / 1000);
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

      const div = document.createElement('div');
      div.className = 'summary-round';
      div.innerHTML = `
        <span class="summary-round-label">Round ${idx + 1}</span>
        <span class="summary-round-time">${timeStr}</span>
      `;
      summary.appendChild(div);
    });

    this.dom.sessionSummary.innerHTML = summary.innerHTML;
  }

  saveAndViewLogs() {
    const session = {
      id: this.sessionStartTime.toISOString(),
      rounds: this.roundHoldTimes.map((holdMs, idx) => ({
        round: idx + 1,
        holdMs,
      })),
      completedRounds: this.totalRounds,
    };

    const sessions = JSON.parse(localStorage.getItem('bw_sessions') || '[]');
    sessions.unshift(session);
    localStorage.setItem('bw_sessions', JSON.stringify(sessions.slice(0, 50)));

    this.renderLogs();
    this.setState('IDLE');
    this.dom.roundsInput.value = CONFIG.defaultRounds;
  }

  renderLogs() {
    const sessions = JSON.parse(localStorage.getItem('bw_sessions') || '[]');
    this.dom.logsTbody.innerHTML = '';

    if (sessions.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="2" class="empty-logs">No sessions yet</td>';
      this.dom.logsTbody.appendChild(tr);
      return;
    }

    sessions.slice(0, 10).forEach((session) => {
      const date = new Date(session.id);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

      const holdTimes = session.rounds
        .map((r) => {
          const mins = Math.floor(r.holdMs / 60000);
          const secs = Math.floor((r.holdMs % 60000) / 1000);
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        })
        .join(', ');

      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${dateStr}</td><td>${holdTimes}</td>`;
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
    const isMuted = this.audio.toggle();
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

  openAdvancedModal() {
    this.dom.breathingCyclesInput.value = CONFIG.breathCount;
    this.dom.inhaleDurationInput.value = CONFIG.breathInMs;
    this.dom.exhaleDurationInput.value = CONFIG.breathOutMs;
    this.dom.pauseDurationInput.value = CONFIG.breathPauseMs;
    this.dom.recoveryDurationInput.value = CONFIG.recoveryHoldMs;

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
    CONFIG.breathOutMs = parseInt(this.dom.exhaleDurationInput.value) || DEFAULT_CONFIG.breathOutMs;
    CONFIG.breathPauseMs = parseInt(this.dom.pauseDurationInput.value) || DEFAULT_CONFIG.breathPauseMs;
    CONFIG.recoveryHoldMs = parseInt(this.dom.recoveryDurationInput.value) || DEFAULT_CONFIG.recoveryHoldMs;

    saveConfig();
    this.closeAdvancedModal();
  }

  resetToDefaults() {
    CONFIG = { ...DEFAULT_CONFIG };
    saveConfig();
    this.openAdvancedModal();
  }

  switchTab(mode) {
    this.dom.tabBtns.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
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
      if (parseInt(btn.dataset.minutes) === minutes) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  selectCustomDuration(minutes) {
    const val = parseInt(minutes) || 10;
    this.selectedMeditationMinutes = val;

    this.dom.presetBtns.forEach(btn => btn.classList.remove('active'));
  }

  startMeditation() {
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

    // Check for interval tone (every 60s)
    if (this.meditationIntervalEnabled) {
      const elapsedSecs = Math.floor(elapsed / 1000);
      const prevElapsedSecs = Math.floor((elapsed - 1000) / 1000);
      if (elapsedSecs > 0 && elapsedSecs % 60 === 0 && prevElapsedSecs % 60 !== 0) {
        this.audio.meditationIntervalSound();
      }
    }

    // Update display
    const remainingSecs = Math.floor(remaining / 1000);
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;
    this.dom.meditationTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Update next interval label
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
  // Prevent zoom on double-tap
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Prevent body scroll during breathing
  document.addEventListener('touchmove', (e) => {
    const stage = document.querySelector('.stage:not(.hidden)');
    if (stage && stage.id !== 'stage-idle') {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent text selection during session
  document.addEventListener('selectstart', (e) => {
    const stage = document.querySelector('.stage:not(.hidden)');
    if (stage && stage.id !== 'stage-idle') {
      e.preventDefault();
    }
  });

  new BreathworkApp();
});

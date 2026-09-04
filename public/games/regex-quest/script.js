/* Regex Quest JS Game Engine */

// Sound Synth Engine using Web Audio API
class CyberSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  playError() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  playLevelUp() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const notes = [329.63, 392.0, 523.25, 659.25]; // E-G-C-E arpeggio
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.2);
    });
  }

  playGameWin() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const melody = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];

    melody.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }
}

const synth = new CyberSynth();

// Levels Definition
const LEVELS = [
  {
    name: 'SECTOR 1: CHRONOS PROTOCOL',
    desc: 'Write a pattern to match digital clock times (24-hour HH:MM format). HH is 00-23, MM is 00-59.',
    targets: ['14:30', '09:15', '23:59', '00:00'],
    decoies: ['99:99', '12-30', '8:30', '14:3', 'ab:cd'],
  },
  {
    name: 'SECTOR 2: HEX COLOR BREAKOUT',
    desc: 'Match standard hexadecimal color codes with leading hashtag. Support 3 or 6 hex digits.',
    targets: ['#fff', '#FF0033', '#123456', '#000000', '#A9bC34'],
    decoies: ['#12', 'fff', '#GGGGGG', 'rgb(0,0,0)', '#abcd', '#12345'],
  },
  {
    name: 'SECTOR 3: GATEWAY IPv4 BREACH',
    desc: 'Match valid IPv4 addresses. Four octets (0-255) separated by dots.',
    targets: ['192.168.1.1', '10.0.0.254', '8.8.8.8', '172.16.254.1'],
    decoies: ['300.400.1.1', '192.168.1', '8.8.8.256', 'abc.def.ghi.jkl', '192.168.1.1.1'],
  },
];

// Game State variables
let currentLevelIdx = 0;
let score = 0;
let timeRemaining = 45;
let timerInterval = null;
let gameStarted = false;
let gameFinished = false;

// DOM Elements
const audioToggle = document.getElementById('audioToggle');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const bypassBtn = document.getElementById('bypassBtn');
const regexInput = document.getElementById('regexInput');
const regexError = document.getElementById('regexError');
const levelNameEl = document.getElementById('levelName');
const levelDescEl = document.getElementById('levelDesc');
const levelNumEl = document.getElementById('levelNum');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const targetStatusEl = document.getElementById('targetStatus');
const targetsList = document.getElementById('targetsList');
const decoysList = document.getElementById('decoysList');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverDesc = document.getElementById('gameOverDesc');
const finalScoreVal = document.getElementById('finalScore');
const finalLevelVal = document.getElementById('finalLevel');
const highScoreVal = document.getElementById('highScore');

// Audio Toggle Button
audioToggle.addEventListener('click', () => {
  synth.enabled = !synth.enabled;
  if (synth.enabled) {
    audioToggle.innerHTML = '<span class="audio-icon">🔊</span> AUDIO: ON';
    audioToggle.classList.remove('text-red');
    synth.init();
  } else {
    audioToggle.innerHTML = '<span class="audio-icon">🔇</span> AUDIO: OFF';
    audioToggle.classList.add('text-red');
  }
});

// Start Breach click
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetToMenu);
bypassBtn.addEventListener('click', handleBypassLevel);

regexInput.addEventListener('input', () => {
  synth.playClick();
  evaluateRegex();
});

function startGame() {
  synth.init();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');

  currentLevelIdx = 0;
  score = 0;
  gameStarted = true;
  gameFinished = false;

  loadLevel(currentLevelIdx);
}

function loadLevel(idx) {
  const level = LEVELS[idx];
  levelNameEl.textContent = level.name;
  levelDescEl.textContent = level.desc;
  levelNumEl.textContent = `0${idx + 1} / 0${LEVELS.length}`;

  regexInput.value = '';
  regexError.textContent = '';
  bypassBtn.disabled = true;
  bypassBtn.classList.remove('ready');

  timeRemaining = 45;
  timerEl.textContent = `${timeRemaining}s`;

  renderStrings();
  evaluateRegex();

  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
}

function renderStrings() {
  const level = LEVELS[currentLevelIdx];

  // Clear list
  targetsList.innerHTML = '';
  decoysList.innerHTML = '';

  level.targets.forEach(text => {
    const item = document.createElement('div');
    item.className = 'string-item unmatched-missing';
    item.textContent = text;
    targetsList.appendChild(item);
  });

  level.decoies.forEach(text => {
    const item = document.createElement('div');
    item.className = 'string-item unmatched-missing';
    item.textContent = text;
    decoysList.appendChild(item);
  });
}

function evaluateRegex() {
  const pattern = regexInput.value;
  const level = LEVELS[currentLevelIdx];

  if (!pattern) {
    regexError.textContent = '';
    renderEvaluation(null);
    return;
  }

  try {
    // Evaluate with anchors to encourage precise matching
    const regex = new RegExp(pattern);
    regexError.textContent = '';
    renderEvaluation(regex);
  } catch (e) {
    regexError.textContent = `Syntax Error: ${e.message}`;
    renderEvaluation(null);
  }
}

function renderEvaluation(regex) {
  const level = LEVELS[currentLevelIdx];

  let matchedTargets = 0;
  let matchedDecoys = 0;

  // Evaluate targets
  const targetItems = targetsList.querySelectorAll('.string-item');
  targetItems.forEach((item, idx) => {
    const val = level.targets[idx];
    if (regex) {
      // Check full match vs partial match - for clock/color/ip, checking test is standard
      // We want to verify if regex matches the string.
      const matches = regex.test(val);
      if (matches) {
        item.className = 'string-item matched-correct';
        item.innerHTML = highlightMatch(val, regex);
        matchedTargets++;
      } else {
        item.className = 'string-item unmatched-missing';
        item.textContent = val;
      }
    } else {
      item.className = 'string-item unmatched-missing';
      item.textContent = val;
    }
  });

  // Evaluate decoys
  const decoyItems = decoysList.querySelectorAll('.string-item');
  decoyItems.forEach((item, idx) => {
    const val = level.decoies[idx];
    if (regex) {
      const matches = regex.test(val);
      if (matches) {
        item.className = 'string-item matched-incorrect';
        item.innerHTML = highlightMatch(val, regex);
        matchedDecoys++;
      } else {
        item.className = 'string-item unmatched-missing';
        item.textContent = val;
      }
    } else {
      item.className = 'string-item unmatched-missing';
      item.textContent = val;
    }
  });

  targetStatusEl.textContent = `${matchedTargets} / ${level.targets.length}`;

  // Enable bypass button if all targets match and no decoys match
  if (regex && matchedTargets === level.targets.length && matchedDecoys === 0) {
    bypassBtn.disabled = false;
    bypassBtn.classList.add('ready');
  } else {
    bypassBtn.disabled = true;
    bypassBtn.classList.remove('ready');
  }
}

function highlightMatch(str, regex) {
  // Reset regex index for global matches
  regex.lastIndex = 0;
  const match = str.match(regex);
  if (!match) return str;

  // Use replace to wrap matched range in mark tags
  const matchedText = match[0];
  if (!matchedText) return str; // Avoid empty regex loop hang

  const idx = str.indexOf(matchedText);
  if (idx === -1) return str;

  const before = str.substring(0, idx);
  const highlighted = `<mark>${matchedText}</mark>`;
  const after = str.substring(idx + matchedText.length);

  return before + highlighted + after;
}

function updateTimer() {
  timeRemaining--;
  timerEl.textContent = `${timeRemaining}s`;

  if (timeRemaining <= 0) {
    finishGame(false);
  }
}

function handleBypassLevel() {
  clearInterval(timerInterval);
  score += timeRemaining * 10 * (currentLevelIdx + 1);
  scoreEl.textContent = score < 1000 ? `0${score}` : score;

  currentLevelIdx++;
  if (currentLevelIdx < LEVELS.length) {
    synth.playLevelUp();
    loadLevel(currentLevelIdx);
  } else {
    finishGame(true);
  }
}

function finishGame(success) {
  gameFinished = true;
  clearInterval(timerInterval);

  let storedHighScore = parseInt(localStorage.getItem('regex_quest_highscore') || '0', 10);
  if (score > storedHighScore) {
    localStorage.setItem('regex_quest_highscore', score.toString());
    storedHighScore = score;
  }

  if (success) {
    gameOverTitle.textContent = 'SYSTEM BREACHED';
    gameOverTitle.className = 'text-green';
    gameOverDesc.textContent = 'Decryption successful. You bypassed all security clusters.';
    synth.playGameWin();
  } else {
    gameOverTitle.textContent = 'TRACED';
    gameOverTitle.className = 'text-red';
    gameOverDesc.textContent = 'Your security signature was flagged. Connection severed.';
    synth.playError();
  }

  finalScoreVal.textContent = score;
  finalLevelVal.textContent = currentLevelIdx + (success ? 0 : 1);
  highScoreVal.textContent = storedHighScore;

  gameOverScreen.classList.remove('hidden');
}

function resetToMenu() {
  clearInterval(timerInterval);
  gameOverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  gameStarted = false;
  gameFinished = false;
}

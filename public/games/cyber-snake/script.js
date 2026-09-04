/* Cyber-Snake JS Game Engine */

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

  playFeed() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.08);
  }

  playGlitchFeed() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.15);
  }

  playCrash() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.4);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.4);
  }
}

const synth = new CyberSynth();

// Game configuration and constants
const GRID_SIZE = 20; // 20px grid blocks
const CANVAS_WIDTH = 560;
const CANVAS_HEIGHT = 400;
const COLS = CANVAS_WIDTH / GRID_SIZE; // 28
const ROWS = CANVAS_HEIGHT / GRID_SIZE; // 20

// State
let snake = [];
let direction = 'right';
let nextDirection = 'right';
let food = { x: 0, y: 0, type: 'normal' }; // normal, glitch
let obstacles = []; // only in glitch mode
let score = 0;
let multiplier = 1.0;
let gameMode = 'classic'; // classic, glitch
let highScores = { classic: 0, glitch: 0 };
let gameActive = false;
let gameInterval = null;
let lastTickTime = 0;
let currentSpeed = 100; // tick interval in ms

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const multiplierEl = document.getElementById('multiplier');
const gameModeDisplay = document.getElementById('gameModeDisplay');
const finalScoreVal = document.getElementById('finalScore');
const finalHighScoreVal = document.getElementById('finalHighScore');
const audioToggle = document.getElementById('audioToggle');
const modeButtons = document.querySelectorAll('.btn-mode');

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

// Mode Selection
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameMode = btn.getAttribute('data-mode');
    gameModeDisplay.textContent = gameMode.toUpperCase();
    if (gameMode === 'glitch') {
      gameModeDisplay.className = 'stat-val text-purple';
    } else {
      gameModeDisplay.className = 'stat-val text-cyan';
    }
    loadHighScore();
  });
});

// Start and controls
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetToMenu);

// Load high scores from storage
function loadHighScore() {
  const stored = localStorage.getItem(`cyber_snake_highscore_${gameMode}`);
  highScores[gameMode] = stored ? parseInt(stored, 10) : 0;
  highScoreEl.textContent =
    highScores[gameMode] < 1000 ? `0${highScores[gameMode]}` : highScores[gameMode];
}

loadHighScore();

function startGame() {
  synth.init();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');

  // Reset State
  snake = [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ];
  direction = 'right';
  nextDirection = 'right';
  score = 0;
  multiplier = 1.0;
  obstacles = [];
  currentSpeed = gameMode === 'glitch' ? 90 : 100;

  updateHUD();
  spawnFood();
  if (gameMode === 'glitch') {
    spawnObstacles();
  }

  gameActive = true;
  lastTickTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function updateHUD() {
  scoreEl.textContent = score < 1000 ? `0${score}` : score;
  multiplierEl.textContent = `x${multiplier.toFixed(1)}`;
}

function spawnFood() {
  let valid = false;
  let rx, ry;
  while (!valid) {
    rx = Math.floor(Math.random() * COLS);
    ry = Math.floor(Math.random() * ROWS);

    // check not on snake
    valid = !snake.some(segment => segment.x === rx && segment.y === ry);

    // check not on obstacles
    if (valid) {
      valid = !obstacles.some(obs => obs.x === rx && obs.y === ry);
    }
  }

  // 20% chance of glitch food in glitch mode
  const type = gameMode === 'glitch' && Math.random() < 0.25 ? 'glitch' : 'normal';
  food = { x: rx, y: ry, type };
}

function spawnObstacles() {
  obstacles = [];
  const obstacleCount = 6;
  for (let i = 0; i < obstacleCount; i++) {
    let valid = false;
    let rx, ry;
    while (!valid) {
      rx = Math.floor(Math.random() * COLS);
      ry = Math.floor(Math.random() * ROWS);

      // Not too close to start snake position
      const nearStart = Math.abs(rx - 5) < 3 && Math.abs(ry - 10) < 3;

      valid =
        !nearStart &&
        !snake.some(seg => seg.x === rx && seg.y === ry) &&
        (food.x !== rx || food.y !== ry);
    }
    obstacles.push({ x: rx, y: ry });
  }
}

// Key listeners
window.addEventListener('keydown', e => {
  if (!gameActive) return;

  const key = e.key.toLowerCase();

  if ((key === 'arrowup' || key === 'w') && direction !== 'down') {
    nextDirection = 'up';
    e.preventDefault();
  } else if ((key === 'arrowdown' || key === 's') && direction !== 'up') {
    nextDirection = 'down';
    e.preventDefault();
  } else if ((key === 'arrowleft' || key === 'a') && direction !== 'right') {
    nextDirection = 'left';
    e.preventDefault();
  } else if ((key === 'arrowright' || key === 'd') && direction !== 'left') {
    nextDirection = 'right';
    e.preventDefault();
  }
});

// Game Loop
function gameLoop(now) {
  if (!gameActive) return;

  requestAnimationFrame(gameLoop);

  const elapsed = now - lastTickTime;
  if (elapsed >= currentSpeed) {
    lastTickTime = now - (elapsed % currentSpeed);
    tick();
  }
}

function tick() {
  direction = nextDirection;

  // Head position
  const head = { ...snake[0] };

  switch (direction) {
    case 'up':
      head.y--;
      break;
    case 'down':
      head.y++;
      break;
    case 'left':
      head.x--;
      break;
    case 'right':
      head.x++;
      break;
  }

  // Check collisions
  if (gameMode === 'classic') {
    // Wall boundaries
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      handleGameOver();
      return;
    }
  } else {
    // Glitch wraps around walls
    if (head.x < 0) head.x = COLS - 1;
    if (head.x >= COLS) head.x = 0;
    if (head.y < 0) head.y = ROWS - 1;
    if (head.y >= ROWS) head.y = 0;

    // Collide with obstacle
    if (obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
      handleGameOver();
      return;
    }
  }

  // Self-intersection check
  if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
    handleGameOver();
    return;
  }

  // Insert new head
  snake.unshift(head);

  // Check eating food
  if (head.x === food.x && head.y === food.y) {
    if (food.type === 'glitch') {
      synth.playGlitchFeed();
      score += Math.round(25 * multiplier);
      multiplier += 0.3;
      // Glitch speed up temporary
      currentSpeed = Math.max(50, currentSpeed - 8);
    } else {
      synth.playFeed();
      score += Math.round(10 * multiplier);
      multiplier += 0.1;
      if (gameMode === 'glitch') {
        // scale speed with length slightly
        currentSpeed = Math.max(55, 90 - snake.length * 1.5);
      }
    }
    updateHUD();
    spawnFood();
  } else {
    snake.pop(); // remove tail segment
  }

  draw();
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. Draw neon grid lines background
  ctx.strokeStyle = 'rgba(31, 34, 48, 0.4)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * GRID_SIZE, 0);
    ctx.lineTo(c * GRID_SIZE, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * GRID_SIZE);
    ctx.lineTo(CANVAS_WIDTH, r * GRID_SIZE);
    ctx.stroke();
  }

  // 2. Draw obstacles in glitch mode
  if (gameMode === 'glitch') {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    obstacles.forEach(obs => {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ef4444';
      ctx.fillRect(obs.x * GRID_SIZE + 2, obs.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
      ctx.strokeRect(obs.x * GRID_SIZE + 2, obs.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    });
  }

  // 3. Draw Food fragment
  ctx.shadowBlur = 12;
  if (food.type === 'glitch') {
    ctx.fillStyle = '#a855f7'; // pulsing purple
    ctx.shadowColor = '#a855f7';
  } else {
    ctx.fillStyle = '#10b981'; // pulsing green
    ctx.shadowColor = '#10b981';
  }
  ctx.beginPath();
  ctx.arc(
    food.x * GRID_SIZE + GRID_SIZE / 2,
    food.y * GRID_SIZE + GRID_SIZE / 2,
    GRID_SIZE / 2 - 3,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 4. Draw Snake
  snake.forEach((segment, idx) => {
    // Head has brighter color
    if (idx === 0) {
      ctx.fillStyle = '#C2410C'; // bright cyan
      ctx.shadowColor = '#C2410C';
      ctx.shadowBlur = 15;
    } else {
      // body segments fade slightly
      ctx.fillStyle = `rgba(194, 65, 12, ${Math.max(0.4, 1.0 - idx / (snake.length + 2))})`;
      ctx.shadowColor = '#C2410C';
      ctx.shadowBlur = 5;
    }

    ctx.fillRect(
      segment.x * GRID_SIZE + 1,
      segment.y * GRID_SIZE + 1,
      GRID_SIZE - 2,
      GRID_SIZE - 2
    );
  });

  // reset shadow
  ctx.shadowBlur = 0;
}

function handleGameOver() {
  gameActive = false;
  synth.playCrash();

  if (score > highScores[gameMode]) {
    highScores[gameMode] = score;
    localStorage.setItem(`cyber_snake_highscore_${gameMode}`, score.toString());
  }

  finalScoreVal.textContent = score;
  finalHighScoreVal.textContent = highScores[gameMode];
  gameOverScreen.classList.remove('hidden');
}

function resetToMenu() {
  gameOverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  gameActive = false;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

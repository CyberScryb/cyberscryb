/* Hacker Speed Typer JS Engine */

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

    playClick(pitch = 1) {
        if (!this.enabled) return;
        this.init();
        const ctx = this.ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        // Base mechanical keyboard click frequency
        osc.frequency.setValueAtTime(150 * pitch, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10 * pitch, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    }

    playError() {
        if (!this.enabled) return;
        this.init();
        const ctx = this.ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.setValueAtTime(80, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    }

    playSuccess() {
        if (!this.enabled) return;
        this.init();
        const ctx = this.ctx;

        const now = ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C Major arpeggio

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);

            gain.gain.setValueAtTime(0, now + idx * 0.1);
            gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.25);
        });
    }
}

const synth = new CyberSynth();

// Code Snippets Database
const CODE_SNIPPETS = {
    javascript: `// Aync task runner with retries
async function fetchWithRetry(url, options = {}, retries = 3) {
    const { backoff = 500, statusCodes = [500, 502, 503, 504] } = options;
    try {
        const response = await fetch(url, options);
        if (!response.ok && statusCodes.includes(response.status) && retries > 0) {
            await new Promise(res => setTimeout(res, backoff));
            return fetchWithRetry(url, { ...options, backoff: backoff * 2 }, retries - 1);
        }
        return await response.json();
    } catch (err) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, backoff));
            return fetchWithRetry(url, { ...options, backoff: backoff * 2 }, retries - 1);
        }
        throw new Error("Breach failure: maximum retries reached.");
    }
}`,
    python: `# Secure memory allocator
import os, hashlib

class MemoryBuffer:
    def __init__(self, size: int):
        self._size = size
        self._buffer = bytearray(size)
        self._key = os.urandom(32)

    def write_payload(self, offset: int, data: bytes):
        if offset + len(data) > self._size:
            raise ValueError("Buffer overflow detected")
        checksum = hashlib.sha256(data).digest()
        for idx in range(len(data)):
            self._buffer[offset + idx] = data[idx] ^ self._key[idx % 32]
        return checksum

    def read_payload(self, offset: int, length: int) -> bytes:
        raw = bytearray(length)
        for idx in range(length):
            raw[idx] = self._buffer[offset + idx] ^ self._key[idx % 32]
        return bytes(raw)`,
    css: `/* Cyber Grid Core layout */
.grid-terminal {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    padding: 2rem;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.grid-terminal::before {
    content: '';
    grid-column: 1 / -1;
    height: 4px;
    background: linear-gradient(90deg, #a855f7, #06b6d4);
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
}`
};

// Game State variables
let activeLanguage = 'javascript';
let targetCode = '';
let currentIdx = 0;
let totalTyped = 0;
let errors = 0;
let combo = 0;
let gameStarted = false;
let gameFinished = false;
let startTime = null;
let timerInterval = null;
let traceTimeRemaining = 60;

// DOM Elements
const audioToggle = document.getElementById('audioToggle');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverDesc = document.getElementById('gameOverDesc');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const typerArena = document.getElementById('typerArena');
const codeEditor = document.getElementById('codeEditor');
const hiddenInput = document.getElementById('hiddenInput');
const modeButtons = document.querySelectorAll('.btn-mode');
const wpmVal = document.getElementById('wpm');
const accVal = document.getElementById('accuracy');
const comboVal = document.getElementById('combo');
const traceTimerVal = document.getElementById('traceTimer');
const progressPctVal = document.getElementById('progressPct');
const bypassFillVal = document.getElementById('bypassFill');
const finalWpmVal = document.getElementById('finalWpm');
const finalAccVal = document.getElementById('finalAccuracy');
const highScoreVal = document.getElementById('highScore');

// Audio Toggle Button click
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

// Mode buttons toggle selection
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeLanguage = btn.getAttribute('data-lang');
    });
});

// Initialize game
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetToMenu);

typerArena.addEventListener('click', () => {
    if (gameStarted && !gameFinished) {
        hiddenInput.focus();
    }
});

hiddenInput.addEventListener('input', handleKeyPress);
hiddenInput.addEventListener('keydown', (e) => {
    // Prevent standard default behavior for certain keys to keep editor focus clean
    if (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
    }
});

function startGame() {
    synth.init();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    typerArena.classList.remove('hidden');

    targetCode = CODE_SNIPPETS[activeLanguage];
    currentIdx = 0;
    totalTyped = 0;
    errors = 0;
    combo = 0;
    traceTimeRemaining = 60;
    gameStarted = true;
    gameFinished = false;
    startTime = Date.now();

    renderCodeTemplate();
    updateStatsDisplay();

    hiddenInput.value = '';
    hiddenInput.focus();

    // Start timer loop
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function renderCodeTemplate() {
    codeEditor.innerHTML = '';
    const lines = targetCode.split('\n');
    let absoluteIndex = 0;

    lines.forEach((lineText, lineIdx) => {
        const lineEl = document.createElement('span');
        lineEl.className = 'code-line';

        for (let i = 0; i < lineText.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.className = 'char';
            charSpan.textContent = lineText[i];
            charSpan.dataset.absIndex = absoluteIndex;
            lineEl.appendChild(charSpan);
            absoluteIndex++;
        }

        // Add visual trailing newline except for the last line
        if (lineIdx < lines.length - 1) {
            const newlineSpan = document.createElement('span');
            newlineSpan.className = 'char';
            newlineSpan.textContent = '\n';
            newlineSpan.dataset.absIndex = absoluteIndex;
            lineEl.appendChild(newlineSpan);
            absoluteIndex++;
        }

        codeEditor.appendChild(lineEl);
    });

    // Mark first character as current
    updateCaretPosition();
}

function updateCaretPosition() {
    const chars = codeEditor.querySelectorAll('.char');
    chars.forEach(span => {
        span.classList.remove('current');
    });

    const currentSpan = codeEditor.querySelector(`.char[data-abs-index="${currentIdx}"]`);
    if (currentSpan) {
        currentSpan.classList.add('current');
        // Scroll into view if needed
        currentSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function handleKeyPress(e) {
    if (!gameStarted || gameFinished) return;

    const val = hiddenInput.value;
    if (val.length === 0) return;

    // Reset input for next keypress
    hiddenInput.value = '';

    const typedChar = val[0];
    const targetChar = targetCode[currentIdx];

    totalTyped++;

    if (typedChar === targetChar || (targetChar === '\n' && (typedChar === ' ' || typedChar === '\n'))) {
        // Correct key
        markCharResult(currentIdx, true);
        combo++;
        let multiplier = Math.min(5, 1 + Math.floor(combo / 20));
        comboVal.textContent = `x${multiplier}`;

        // Synth Click Audio based on character type
        if (targetChar === ' ') {
            synth.playClick(0.7); // Deeper tone for space
        } else if (targetChar === '\n') {
            synth.playClick(1.5); // Higher click for return
        } else {
            synth.playClick(1.0 + (multiplier - 1) * 0.05); // Speed multiplier pitch modifier
        }

        currentIdx++;
    } else {
        // Incorrect key
        errors++;
        combo = 0;
        comboVal.textContent = 'x1';
        markCharResult(currentIdx, false);
        synth.playError();
    }

    // Auto-skip indentation whitespace if the user successfully presses enter
    // or if the cursor lands on indentation whitespace at the start of a line
    while (currentIdx < targetCode.length && targetCode[currentIdx] === ' ' && (currentIdx === 0 || targetCode[currentIdx - 1] === '\n')) {
        // Automatically skip matching leading whitespace to keep speed high
        currentIdx++;
    }

    updateCaretPosition();
    updateStatsDisplay();

    // Check if fully complete
    if (currentIdx >= targetCode.length) {
        finishGame(true);
    }
}

function markCharResult(index, isCorrect) {
    const span = codeEditor.querySelector(`.char[data-abs-index="${index}"]`);
    if (span) {
        if (isCorrect) {
            span.classList.add('correct');
            span.classList.remove('incorrect');
        } else {
            span.classList.add('incorrect');
            span.classList.remove('correct');
        }
    }
}

function updateStatsDisplay() {
    // Word count calculation: 5 chars = 1 word
    const elapsedSeconds = Math.max(1, (Date.now() - startTime) / 1000);
    const correctChars = currentIdx - errors;
    const wpm = Math.max(0, Math.round((correctChars / 5) / (elapsedSeconds / 60)));
    wpmVal.textContent = wpm < 10 ? `0${wpm}` : wpm;

    const acc = totalTyped > 0 ? Math.round(((totalTyped - errors) / totalTyped) * 100) : 100;
    accVal.textContent = `${acc}%`;

    const progress = Math.min(100, Math.round((currentIdx / targetCode.length) * 100));
    progressPctVal.textContent = `${progress}%`;
    bypassFillVal.style.width = `${progress}%`;
}

function updateTimer() {
    traceTimeRemaining--;
    traceTimerVal.textContent = `${traceTimeRemaining}s`;

    if (traceTimeRemaining <= 0) {
        finishGame(false);
    }
}

function finishGame(success) {
    gameFinished = true;
    clearInterval(timerInterval);

    // Compute final stats
    const elapsedSeconds = Math.max(1, (Date.now() - startTime) / 1000);
    const correctChars = currentIdx - errors;
    const wpm = Math.max(0, Math.round((correctChars / 5) / (elapsedSeconds / 60)));
    const acc = totalTyped > 0 ? Math.round(((totalTyped - errors) / totalTyped) * 100) : 100;

    // High Score tracking
    let storedHighScore = parseInt(localStorage.getItem('cyber_typer_highscore') || '0', 10);
    if (wpm > storedHighScore) {
        localStorage.setItem('cyber_typer_highscore', wpm.toString());
        storedHighScore = wpm;
    }

    // Configure overlay message
    if (success) {
        gameOverTitle.textContent = 'ACCESS GRANTED';
        gameOverTitle.className = 'text-green';
        gameOverDesc.textContent = 'System firewall successfully bypassed. Encryption key extracted.';
        synth.playSuccess();
    } else {
        gameOverTitle.textContent = 'CONNECTION TERMINATED';
        gameOverTitle.className = 'text-red';
        gameOverDesc.textContent = 'Your signature was identified and quarantined by network administrators.';
        synth.playError();
    }

    finalWpmVal.textContent = wpm;
    finalAccVal.textContent = `${acc}%`;
    highScoreVal.textContent = `${storedHighScore} WPM`;

    typerArena.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

function resetToMenu() {
    clearInterval(timerInterval);
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    typerArena.classList.add('hidden');
    gameStarted = false;
    gameFinished = false;
}

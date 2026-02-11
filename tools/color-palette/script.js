/* Color Palette Generator — Logic */

let currentPalette = [];
let currentExportMode = 'css';

const baseColorInput = document.getElementById('baseColor');
const hexInput = document.getElementById('hexInput');
const harmonySelect = document.getElementById('harmony');
const countSelect = document.getElementById('count');

// Sync color picker & hex input
baseColorInput.addEventListener('input', () => {
    hexInput.value = baseColorInput.value.toUpperCase();
    generate();
});
hexInput.addEventListener('input', () => {
    const hex = hexInput.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        baseColorInput.value = hex;
        generate();
    }
});
harmonySelect.addEventListener('change', generate);
countSelect.addEventListener('change', generate);

// HSL <-> RGB <-> Hex conversions
function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// Harmony algorithms
function generateHarmony(baseHex, harmony, count) {
    const [h, s, l] = hexToHsl(baseHex);
    const colors = [];

    switch (harmony) {
        case 'complementary':
            colors.push([h, s, l]);
            colors.push([(h + 180) % 360, s, l]);
            // Fill remaining with lightness variations
            for (let i = 2; i < count; i++) {
                const offset = (i - 1) * 12;
                colors.push([h, s, Math.max(15, Math.min(85, l + (i % 2 === 0 ? offset : -offset)))]);
            }
            break;

        case 'analogous':
            const analogStep = 30;
            for (let i = 0; i < count; i++) {
                const angle = h + (i - Math.floor(count / 2)) * analogStep;
                colors.push([angle, s, l + (i % 2 === 0 ? 0 : (i * 4 - 8))]);
            }
            break;

        case 'triadic':
            colors.push([h, s, l]);
            colors.push([(h + 120) % 360, s, l]);
            colors.push([(h + 240) % 360, s, l]);
            for (let i = 3; i < count; i++) {
                colors.push([colors[i % 3][0], s * 0.7, l + (i * 8)]);
            }
            break;

        case 'split-complementary':
            colors.push([h, s, l]);
            colors.push([(h + 150) % 360, s, l]);
            colors.push([(h + 210) % 360, s, l]);
            for (let i = 3; i < count; i++) {
                const base = colors[i % 3];
                colors.push([base[0], s * 0.6, l + (i % 2 === 0 ? 15 : -15)]);
            }
            break;

        case 'tetradic':
            colors.push([h, s, l]);
            colors.push([(h + 90) % 360, s, l]);
            colors.push([(h + 180) % 360, s, l]);
            colors.push([(h + 270) % 360, s, l]);
            for (let i = 4; i < count; i++) {
                colors.push([colors[i % 4][0], s * 0.5, l + 20]);
            }
            break;

        case 'monochromatic':
        default:
            for (let i = 0; i < count; i++) {
                const lightness = 20 + (60 / (count - 1)) * i;
                const saturation = s + (i % 2 === 0 ? 0 : -10);
                colors.push([h, Math.max(10, saturation), lightness]);
            }
            break;
    }

    return colors.slice(0, count).map(([ch, cs, cl]) => ({
        hex: hslToHex(ch, cs, cl),
        h: Math.round(ch),
        s: Math.round(cs),
        l: Math.round(cl)
    }));
}

function generate() {
    const base = baseColorInput.value;
    const harmony = harmonySelect.value;
    const count = parseInt(countSelect.value);

    currentPalette = generateHarmony(base, harmony, count);
    renderPalette();
    renderExport();
}

function renderPalette() {
    const container = document.getElementById('palette');
    container.innerHTML = currentPalette.map((c, i) => `
        <div class="color-swatch" style="background: ${c.hex}" onclick="copySwatch(${i})" title="Click to copy">
            <span class="swatch-hex">${c.hex}</span>
            <span class="swatch-copied" id="copied-${i}">Copied!</span>
        </div>
    `).join('');
}

function copySwatch(index) {
    const hex = currentPalette[index].hex;
    navigator.clipboard.writeText(hex);
    const el = document.getElementById(`copied-${index}`);
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1200);
}

function switchExport(mode) {
    currentExportMode = mode;
    document.querySelectorAll('.export-tab').forEach(t => t.classList.toggle('active', t.textContent.toLowerCase().includes(mode)));
    renderExport();
}

function renderExport() {
    const el = document.getElementById('exportCode');
    let code = '';

    switch (currentExportMode) {
        case 'css':
            code = ':root {\n' + currentPalette.map((c, i) =>
                `  --color-${i + 1}: ${c.hex};`
            ).join('\n') + '\n}';
            break;

        case 'tailwind':
            code = 'module.exports = {\n  theme: {\n    extend: {\n      colors: {\n        palette: {\n' +
                currentPalette.map((c, i) =>
                    `          ${i + 1}: '${c.hex}',`
                ).join('\n') +
                '\n        }\n      }\n    }\n  }\n}';
            break;

        case 'scss':
            code = currentPalette.map((c, i) =>
                `$color-${i + 1}: ${c.hex};`
            ).join('\n');
            break;

        case 'array':
            code = JSON.stringify(currentPalette.map(c => c.hex), null, 2);
            break;
    }

    el.textContent = code;
}

function copyExport() {
    const code = document.getElementById('exportCode').textContent;
    navigator.clipboard.writeText(code);
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'Copied!';
    btn.classList.add('success');
    setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('success');
    }, 2000);
}

function randomize() {
    const hue = Math.floor(Math.random() * 360);
    const sat = 40 + Math.floor(Math.random() * 50);
    const light = 35 + Math.floor(Math.random() * 25);
    const hex = hslToHex(hue, sat, light);
    baseColorInput.value = hex;
    hexInput.value = hex.toUpperCase();

    const harmonies = ['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic', 'monochromatic'];
    harmonySelect.value = harmonies[Math.floor(Math.random() * harmonies.length)];

    generate();
}

// Init
generate();

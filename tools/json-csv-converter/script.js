// DataShift — JSON ↔ CSV Converter
// 100% client-side conversion logic

let currentMode = 'json-to-csv';

// ── Mode Toggle ──────────────────────────────────────
function setMode(mode) {
    currentMode = mode;
    const toggle = document.querySelector('.mode-toggle');
    const btnJson = document.getElementById('btn-json-to-csv');
    const btnCsv = document.getElementById('btn-csv-to-json');
    const inputLabel = document.getElementById('input-label');
    const outputLabel = document.getElementById('output-label');
    const inputArea = document.getElementById('input-area');

    if (mode === 'json-to-csv') {
        toggle.classList.remove('csv-mode');
        btnJson.classList.add('active');
        btnCsv.classList.remove('active');
        inputLabel.textContent = 'Input JSON';
        outputLabel.textContent = 'Output CSV';
        inputArea.placeholder = 'Paste your JSON here...';
    } else {
        toggle.classList.add('csv-mode');
        btnCsv.classList.add('active');
        btnJson.classList.remove('active');
        inputLabel.textContent = 'Input CSV';
        outputLabel.textContent = 'Output JSON';
        inputArea.placeholder = 'Paste your CSV here...';
    }

    clearError();
}

// ── Conversion ───────────────────────────────────────
function convert() {
    const input = document.getElementById('input-area').value.trim();
    const outputArea = document.getElementById('output-area');
    const btn = document.getElementById('convert-btn');

    if (!input) {
        showError('Please paste some data to convert.');
        return;
    }

    clearError();
    btn.classList.add('converting');

    try {
        let result;
        if (currentMode === 'json-to-csv') {
            result = jsonToCsv(input);
        } else {
            result = csvToJson(input);
        }

        outputArea.value = result;
        updateStats('output-stats', result);

        // Brief visual feedback
        btn.style.boxShadow = '0 4px 24px rgba(34, 197, 94, 0.4)';
        setTimeout(() => {
            btn.style.boxShadow = '';
            btn.classList.remove('converting');
        }, 600);

    } catch (e) {
        btn.classList.remove('converting');
        showError(e.message);
    }
}

// ── JSON → CSV ───────────────────────────────────────
function jsonToCsv(jsonStr) {
    let data;
    try {
        data = JSON.parse(jsonStr);
    } catch (e) {
        throw new Error('Invalid JSON: ' + e.message);
    }

    // Handle single object → wrap in array
    if (!Array.isArray(data)) {
        if (typeof data === 'object' && data !== null) {
            data = [data];
        } else {
            throw new Error('JSON must be an array of objects or a single object.');
        }
    }

    if (data.length === 0) {
        throw new Error('JSON array is empty.');
    }

    if (typeof data[0] !== 'object' || data[0] === null) {
        throw new Error('JSON array must contain objects.');
    }

    // Collect all unique keys across all objects
    const keysSet = new Set();
    data.forEach(obj => {
        Object.keys(obj).forEach(k => keysSet.add(k));
    });
    const headers = Array.from(keysSet);

    // Build CSV
    const lines = [];
    lines.push(headers.map(escapeCsvField).join(','));

    data.forEach(obj => {
        const row = headers.map(h => {
            let val = obj[h];
            if (val === undefined || val === null) return '';
            if (typeof val === 'object') val = JSON.stringify(val);
            return escapeCsvField(String(val));
        });
        lines.push(row.join(','));
    });

    return lines.join('\n');
}

// ── CSV → JSON ───────────────────────────────────────
function csvToJson(csvStr) {
    const lines = parseCsvLines(csvStr);

    if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row.');
    }

    const headers = lines[0];
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length === 1 && row[0] === '') continue; // skip empty lines

        const obj = {};
        headers.forEach((header, idx) => {
            let val = row[idx] !== undefined ? row[idx] : '';

            // Auto-detect types
            if (val === '') {
                obj[header] = null;
            } else if (val === 'true') {
                obj[header] = true;
            } else if (val === 'false') {
                obj[header] = false;
            } else if (!isNaN(val) && val !== '') {
                obj[header] = Number(val);
            } else {
                // Try parsing JSON objects/arrays
                try {
                    const parsed = JSON.parse(val);
                    if (typeof parsed === 'object') {
                        obj[header] = parsed;
                    } else {
                        obj[header] = val;
                    }
                } catch {
                    obj[header] = val;
                }
            }
        });
        result.push(obj);
    }

    return JSON.stringify(result, null, 2);
}

// ── CSV Parser (RFC 4180 compliant) ──────────────────
function parseCsvLines(text) {
    const results = [];
    let current = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                } else {
                    inQuotes = false;
                    i++;
                }
            } else {
                field += char;
                i++;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
                i++;
            } else if (char === ',') {
                current.push(field);
                field = '';
                i++;
            } else if (char === '\r') {
                current.push(field);
                field = '';
                results.push(current);
                current = [];
                i++;
                if (i < text.length && text[i] === '\n') i++;
            } else if (char === '\n') {
                current.push(field);
                field = '';
                results.push(current);
                current = [];
                i++;
            } else {
                field += char;
                i++;
            }
        }
    }

    // Last field / line
    if (field !== '' || current.length > 0) {
        current.push(field);
        results.push(current);
    }

    return results;
}

// ── CSV Field Escaping ───────────────────────────────
function escapeCsvField(str) {
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// ── UI Helpers ───────────────────────────────────────
function loadSample() {
    const inputArea = document.getElementById('input-area');

    if (currentMode === 'json-to-csv') {
        inputArea.value = JSON.stringify([
            { "name": "Alice Johnson", "email": "alice@example.com", "age": 32, "city": "Portland" },
            { "name": "Bob Smith", "email": "bob@example.com", "age": 28, "city": "Seattle" },
            { "name": "Charlie Brown", "email": "charlie@example.com", "age": 45, "city": "Boise" },
            { "name": "Diana Prince", "email": "diana@example.com", "age": 35, "city": "Spokane" },
            { "name": "Ethan Hunt", "email": "ethan@example.com", "age": 41, "city": "Coeur d'Alene" }
        ], null, 2);
    } else {
        inputArea.value = `name,email,age,city
Alice Johnson,alice@example.com,32,Portland
Bob Smith,bob@example.com,28,Seattle
Charlie Brown,charlie@example.com,45,Boise
Diana Prince,diana@example.com,35,Spokane
Ethan Hunt,ethan@example.com,41,"Coeur d'Alene"`;
    }

    updateStats('input-stats', inputArea.value);
    clearError();
}

function clearInput() {
    document.getElementById('input-area').value = '';
    document.getElementById('output-area').value = '';
    updateStats('input-stats', '');
    updateStats('output-stats', '');
    clearError();
}

function copyOutput() {
    const output = document.getElementById('output-area').value;
    if (!output) return;

    navigator.clipboard.writeText(output).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.classList.add('success');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!`;

        setTimeout(() => {
            btn.classList.remove('success');
            btn.innerHTML = originalHTML;
        }, 2000);
    });
}

function downloadOutput() {
    const output = document.getElementById('output-area').value;
    if (!output) return;

    const ext = currentMode === 'json-to-csv' ? 'csv' : 'json';
    const mime = currentMode === 'json-to-csv' ? 'text/csv' : 'application/json';
    const blob = new Blob([output], { type: mime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `converted.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('input-area').value = e.target.result;
        updateStats('input-stats', e.target.result);
        clearError();
    };
    reader.readAsText(file);

    // Reset input so same file can be uploaded again
    event.target.value = '';
}

function updateStats(elementId, text) {
    const el = document.getElementById(elementId);
    const chars = text.length;
    const lines = text ? text.split('\n').length : 0;
    el.textContent = `${chars.toLocaleString()} chars · ${lines} lines`;
}

function showError(msg) {
    const bar = document.getElementById('error-bar');
    const msgEl = document.getElementById('error-msg');
    msgEl.textContent = msg;
    bar.classList.remove('hidden');
}

function clearError() {
    document.getElementById('error-bar').classList.add('hidden');
}

// ── Input Stats Auto-Update ──────────────────────────
document.getElementById('input-area').addEventListener('input', function () {
    updateStats('input-stats', this.value);
});

// ── Keyboard Shortcut ────────────────────────────────
document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        convert();
    }
});

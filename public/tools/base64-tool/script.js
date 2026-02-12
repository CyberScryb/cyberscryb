/* Base64 Encoder/Decoder — Logic */

let currentMode = 'encode';

function setMode(mode) {
    currentMode = mode;
    const toggle = document.getElementById('modeToggle');
    const btnText = document.getElementById('btnText');
    const inputLabel = document.getElementById('inputLabel');
    const outputLabel = document.getElementById('outputLabel');

    // Update toggle UI
    toggle.classList.toggle('decode-mode', mode === 'decode');
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'encode') {
        btnText.textContent = 'Encode';
        inputLabel.textContent = 'Input — Plain Text';
        outputLabel.textContent = 'Output — Base64';
        document.getElementById('inputArea').placeholder = 'Paste your text here...';
    } else {
        btnText.textContent = 'Decode';
        inputLabel.textContent = 'Input — Base64';
        outputLabel.textContent = 'Output — Plain Text';
        document.getElementById('inputArea').placeholder = 'Paste Base64 string here...';
    }

    // Clear error
    document.getElementById('errorBar').classList.add('hidden');
}

function convert() {
    const input = document.getElementById('inputArea').value;
    const output = document.getElementById('outputArea');
    const urlSafe = document.getElementById('urlSafe').checked;

    if (!input.trim()) {
        showError('Please enter some text to convert.');
        return;
    }

    document.getElementById('errorBar').classList.add('hidden');

    try {
        let result;
        if (currentMode === 'encode') {
            result = btoa(unescape(encodeURIComponent(input)));
            if (urlSafe) {
                result = result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            }
        } else {
            let b64 = input.trim();
            if (urlSafe) {
                b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
                // Add padding
                while (b64.length % 4) b64 += '=';
            }
            result = decodeURIComponent(escape(atob(b64)));
        }
        output.value = result;
        updateStats();
    } catch (e) {
        if (currentMode === 'decode') {
            showError('Invalid Base64 string. Make sure the input is properly Base64 encoded.');
        } else {
            showError('Encoding failed: ' + e.message);
        }
    }
}

function clearInput() {
    document.getElementById('inputArea').value = '';
    document.getElementById('outputArea').value = '';
    document.getElementById('errorBar').classList.add('hidden');
    updateStats();
}

function loadSample() {
    if (currentMode === 'encode') {
        document.getElementById('inputArea').value = '{"name": "CyberScryb", "type": "tools", "count": 4, "free": true}';
    } else {
        document.getElementById('inputArea').value = 'eyJuYW1lIjogIkN5YmVyU2NyeWIiLCAidHlwZSI6ICJ0b29scyIsICJjb3VudCI6IDQsICJmcmVlIjogdHJ1ZX0=';
    }
    updateStats();
}

function copyOutput() {
    const output = document.getElementById('outputArea');
    if (!output.value) return;

    navigator.clipboard.writeText(output.value).then(() => {
        const btns = document.querySelectorAll('.panel:last-child .icon-btn');
        const copyBtn = btns[0];
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('success');
        setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('success');
        }, 2000);
    });
}

function downloadOutput() {
    const output = document.getElementById('outputArea').value;
    if (!output) return;

    const ext = currentMode === 'encode' ? 'b64.txt' : 'decoded.txt';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyberscryb-${ext}`;
    a.click();
    URL.revokeObjectURL(url);
}

function showError(msg) {
    const bar = document.getElementById('errorBar');
    document.getElementById('errorMsg').textContent = msg;
    bar.classList.remove('hidden');
}

function updateStats() {
    const input = document.getElementById('inputArea').value;
    const output = document.getElementById('outputArea').value;
    document.getElementById('inputStats').textContent = `${input.length} chars`;
    document.getElementById('outputStats').textContent = `${output.length} chars`;

    // Size comparison
    const sizeInfo = document.getElementById('sizeInfo');
    if (input.length && output.length) {
        const ratio = ((output.length / input.length - 1) * 100).toFixed(0);
        if (currentMode === 'encode') {
            sizeInfo.textContent = `+${ratio}% size`;
        } else {
            sizeInfo.textContent = `${ratio}% size`;
        }
    } else {
        sizeInfo.textContent = '';
    }
}

// Live stats update
document.getElementById('inputArea').addEventListener('input', updateStats);

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        convert();
    }
});

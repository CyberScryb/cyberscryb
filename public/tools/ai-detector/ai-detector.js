// AI Detector Tool — uses shared CSAITool core + custom score gauge UI
document.addEventListener('DOMContentLoaded', () => {
    const toolInput = document.getElementById('tool-input');
    const wordCountEl = document.getElementById('word-count');
    const inputCharsEl = document.getElementById('input-chars');
    const scoreDisplay = document.getElementById('score-display');
    const scoreArc = document.getElementById('score-arc');
    const scoreNumber = document.getElementById('score-number');
    const scoreLabel = document.getElementById('score-label');
    const markersSection = document.getElementById('markers-section');
    const markersList = document.getElementById('markers-list');
    const analysisSection = document.getElementById('analysis-section');
    const analysisText = document.getElementById('analysis-text');
    const humanizeCta = document.getElementById('humanize-cta');
    const outputText = document.getElementById('output-text');

    const CIRCUMFERENCE = 2 * Math.PI * 68; // ~427.26

    let originalInput = '';

    toolInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        // Update input stats live
        const words = this.value.trim().split(/\s+/).filter(Boolean).length;
        const chars = this.value.length;
        if (wordCountEl) wordCountEl.textContent = words + ' words';
        if (inputCharsEl) inputCharsEl.textContent = chars + ' chars input';
    });

    function getScoreColor(score) {
        if (score <= 20) return '#22c55e'; // green — human
        if (score <= 40) return '#84cc16'; // lime
        if (score <= 60) return '#f59e0b'; // amber
        if (score <= 80) return '#f97316'; // orange
        return '#ef4444'; // red — AI
    }

    function getScoreLabel(score) {
        if (score <= 20) return 'Almost certainly human-written';
        if (score <= 40) return 'Likely human with some AI-like patterns';
        if (score <= 60) return 'Mixed signals — could be either';
        if (score <= 80) return 'Likely AI-generated';
        return 'Almost certainly AI-generated';
    }

    function parseResult(text) {
        const result = { score: null, markers: [], analysis: '' };

        // Extract score
        const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
        if (scoreMatch) {
            result.score = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
        }

        // Extract markers
        const markersMatch = text.match(/MARKERS FOUND:\s*\n([\s\S]*?)(?:\n\s*\nANALYSIS:|$)/i);
        if (markersMatch) {
            const lines = markersMatch[1].split('\n').map(l => l.replace(/^[\s\-*]+/, '').trim()).filter(Boolean);
            result.markers = lines;
        }

        // Extract analysis
        const analysisMatch = text.match(/ANALYSIS:\s*\n?([\s\S]*?)$/i);
        if (analysisMatch) {
            result.analysis = analysisMatch[1].trim();
        }

        return result;
    }

    function renderScoreGauge(parsed) {
        scoreDisplay.classList.remove('hidden');

        if (parsed.score !== null) {
            const score = parsed.score;
            const color = getScoreColor(score);
            const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

            scoreArc.style.stroke = color;
            // Animate the arc
            requestAnimationFrame(() => {
                scoreArc.style.strokeDashoffset = offset;
            });
            scoreNumber.textContent = score;
            scoreNumber.style.color = color;
            scoreLabel.textContent = getScoreLabel(score);
            scoreLabel.style.color = color;
        }

        // Markers
        if (parsed.markers.length > 0) {
            markersSection.classList.remove('hidden');
            markersList.innerHTML = '';
            const color = parsed.score !== null ? getScoreColor(parsed.score) : '#c41e1e';
            parsed.markers.forEach(m => {
                const li = document.createElement('li');
                li.textContent = m;
                li.style.setProperty('--marker-color', color);
                li.querySelector || null; // no-op
                // Set marker dot color
                li.style.cssText += '; --dot-color:' + color;
                // Use inline style for the ::before pseudo
                const style = document.createElement('style');
                style.textContent = '.markers-list li::before { background: ' + color + '; }';
                if (!document.getElementById('marker-dot-style')) {
                    style.id = 'marker-dot-style';
                    document.head.appendChild(style);
                }
                markersList.appendChild(li);
            });
        } else {
            markersSection.classList.add('hidden');
        }

        // Analysis
        if (parsed.analysis) {
            analysisSection.classList.remove('hidden');
            analysisText.textContent = parsed.analysis;
        } else {
            analysisSection.classList.add('hidden');
        }

        // Humanize CTA — show if score >= 40
        if (parsed.score !== null && parsed.score >= 40 && originalInput) {
            humanizeCta.classList.remove('hidden');
            // Store text in localStorage for the humanizer to pick up
            humanizeCta.addEventListener('click', function (e) {
                e.preventDefault();
                try {
                    localStorage.setItem('cs_humanizer_prefill', originalInput);
                } catch (err) { /* storage full — fallback to query param */ }
                // Build URL with truncated query param as fallback
                const encoded = encodeURIComponent(originalInput.slice(0, 2000));
                window.location.href = '../humanizer/index.html?prefill=' + encoded;
            }, { once: true });
        } else {
            humanizeCta.classList.add('hidden');
        }
    }

    function resetGauge() {
        scoreDisplay.classList.add('hidden');
        scoreArc.style.strokeDashoffset = CIRCUMFERENCE;
        scoreNumber.textContent = '--';
        scoreLabel.textContent = 'Waiting for analysis...';
        scoreLabel.style.color = '#888';
        markersSection.classList.add('hidden');
        analysisSection.classList.add('hidden');
        humanizeCta.classList.add('hidden');
        markersList.innerHTML = '';
        analysisText.textContent = '';
    }

    window.CSAITool.init({
        toolId: 'ai-detector',
        emptyMessage: 'Please paste some text to analyze.',
        collectInput: () => {
            originalInput = toolInput.value.trim();
            resetGauge();
            return originalInput;
        },
        collectParams: () => {
            return {};
        },
        onStats: (text) => {
            // Parse the structured response and render gauge
            const parsed = parseResult(text);
            renderScoreGauge(parsed);

            // Update word count from output
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            if (wordCountEl) wordCountEl.textContent = words + ' words';
        }
    });
});

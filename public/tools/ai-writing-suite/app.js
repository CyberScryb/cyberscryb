/* ═══════════════════════════════════════════════
   CyberScryb AI Writing Suite — Premium App Controller
   Inline highlighting, clickable phrases, circle ring,
   progressive disclosure, rich popovers
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ── Elements ──
    const textarea = document.getElementById('editor-textarea');
    const highlightLayer = document.getElementById('highlight-layer');
    const legendBar = document.getElementById('inline-legend');
    const scoreEmpty = document.getElementById('score-empty');
    const scoreActive = document.getElementById('score-active');
    const scoreRing = document.getElementById('score-ring');
    const scoreNumber = document.getElementById('score-number');
    const scoreVerdict = document.getElementById('score-verdict');
    const scoreBadge = document.getElementById('short-text-badge');
    const heuristicList = document.getElementById('heuristic-list');
    const heuristicsToggle = document.getElementById('heuristics-toggle');

    const readabilityCard = document.getElementById('readability-card');
    const readabilityContent = document.getElementById('readability-content');
    const toneCard = document.getElementById('tone-card');
    const toneContent = document.getElementById('tone-content');
    const passiveCard = document.getElementById('passive-card');
    const passiveContent = document.getElementById('passive-content');
    const repetitionCard = document.getElementById('repetition-card');
    const repetitionContent = document.getElementById('repetition-content');

    const wordCountEl = document.getElementById('word-count');
    const sentenceCountEl = document.getElementById('stat-sentences');
    const readingTimeEl = document.getElementById('stat-reading');
    const charCountEl = document.getElementById('stat-chars');
    const counterEl = document.getElementById('analysis-counter');
    const styleSelect = document.getElementById('style-select');

    // ── State ──
    let debounceTimer = null;
    let lastResult = null;
    let currentPopover = null;
    let analysisCount = parseInt(localStorage.getItem('aws_count') || '0', 10);
    counterEl.textContent = analysisCount.toLocaleString();

    // ── Initialize detector ──
    if (typeof AIDetector !== 'undefined' && AIDetector.init) {
        AIDetector.init();
    }

    // ── Auto-save restore ──
    const saved = localStorage.getItem('aws_draft');
    if (saved) { textarea.value = saved; runAnalysis(); }

    // ── Event Listeners ──
    textarea.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            runAnalysis();
            localStorage.setItem('aws_draft', textarea.value);
        }, 400);
    });

    // Sync scroll between textarea and highlight layer
    textarea.addEventListener('scroll', () => {
        highlightLayer.scrollTop = textarea.scrollTop;
    });

    // ── Click on textarea → detect which sentence, show popover ──
    textarea.addEventListener('click', (e) => {
        if (!lastResult || !lastResult.sentences || lastResult.sentences.length === 0) return;

        // Get cursor position in textarea
        const cursorPos = textarea.selectionStart;
        const text = textarea.value;

        // Find which sentence the cursor is in
        let charCount = 0;
        for (const sentence of lastResult.sentences) {
            const idx = text.indexOf(sentence.text, charCount);
            if (idx === -1) continue;
            const sentEnd = idx + sentence.text.length;

            if (cursorPos >= idx && cursorPos <= sentEnd) {
                // Found the sentence — show popover
                showPopover(e, sentence, sentence.index);
                return;
            }
            charCount = sentEnd;
        }
    });

    document.getElementById('btn-paste').addEventListener('click', async () => {
        try {
            const clip = await navigator.clipboard.readText();
            textarea.value = clip;
            runAnalysis();
        } catch { textarea.focus(); }
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        textarea.value = '';
        localStorage.removeItem('aws_draft');
        resetUI();
    });

    // GPTZero-style example pills
    const exampleTexts = {
        chatgpt: `Artificial intelligence has become an integral part of modern society, revolutionizing various industries and transforming the way we live and work. As technology continues to evolve at an unprecedented pace, it is crucial to understand both the benefits and challenges that come with these advancements. Moreover, the integration of machine learning algorithms has enabled organizations to make data-driven decisions with remarkable efficiency. It is important to note that these technological innovations have the potential to reshape entire sectors, from healthcare to finance, creating opportunities for growth and development on an unprecedented scale.`,
        human: `I've been coding since I was 14, starting with a janky calculator app that crashed every time you divided by zero. Nobody taught me — I just Googled stuff until it worked. Last week I spent four hours debugging a CSS grid issue that turned out to be a missing semicolon. My coffee went cold twice. That's the reality of this job: it's 90% confusion and 10% feeling like a genius when the tests finally pass. I wouldn't trade it for anything, but I'd be lying if I said imposter syndrome doesn't hit at 2 AM.`,
        mixed: `Machine learning has fundamentally transformed the landscape of data analysis, enabling unprecedented insights across industries. The integration of neural networks in modern applications has demonstrated remarkable potential for solving complex problems.

But honestly? When I first tried training a model on my laptop, it sounded like a jet engine was taking off in my apartment. My cat knocked the ethernet cable out halfway through and I lost 6 hours of training. That's the part the tutorials never mention — the unglamorous, messy reality behind the clean demo slides.`
    };

    document.querySelectorAll('.example-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.example;
            textarea.value = exampleTexts[type] || exampleTexts.chatgpt;
            runAnalysis();
        });
    });

    // Heuristics toggle
    heuristicsToggle.addEventListener('click', () => {
        heuristicsToggle.classList.toggle('open');
        heuristicList.classList.toggle('open');
        heuristicsToggle.textContent = heuristicList.classList.contains('open')
            ? 'Hide Technical Details' : 'View Technical Details';
    });

    // Report modal
    document.getElementById('btn-report')?.addEventListener('click', (e) => {
        e.preventDefault();
        showReportModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'd') { e.preventDefault(); runAnalysis(); }
        if (e.key === 'Escape' && currentPopover) { closePopover(); }
    });

    // ═══ MAIN ANALYSIS ═══
    function runAnalysis() {
        const text = textarea.value.trim();
        if (!text || text.split(/\s+/).length < 3) { resetUI(); return; }

        if (typeof AIDetector === 'undefined') {
            console.warn('AIDetector not loaded'); return;
        }

        const style = styleSelect ? styleSelect.value : 'auto';
        const result = AIDetector.analyze(text, style);
        lastResult = result;

        // Update counter
        analysisCount++;
        localStorage.setItem('aws_count', analysisCount);
        counterEl.textContent = analysisCount.toLocaleString();

        // Update stats
        const words = text.split(/\s+/).filter(Boolean).length;
        wordCountEl.textContent = words;
        sentenceCountEl.textContent = result.sentences.length;
        readingTimeEl.textContent = Math.max(1, Math.ceil(words / 230)) + 'm';
        charCountEl.textContent = text.length.toLocaleString();

        // Show active score UI
        scoreEmpty.style.display = 'none';
        scoreActive.style.display = 'block';
        legendBar.style.display = 'flex';

        // Score ring
        updateScoreRing(result.score, result.sentences);

        // Heuristics — these are objects with { score, rawScore, weight, detail }
        updateHeuristics(result.heuristics);

        // Inline highlighting
        updateHighlightLayer(result.sentences, text);

        // Dashboard cards — call detector's dedicated APIs
        updateDashboardCards(text, result);

        // Short text warning
        scoreBadge.style.display = words < 50 ? 'flex' : 'none';
    }

    // ═══ SCORE RING ═══
    function updateScoreRing(score, sentences) {
        const circumference = 2 * Math.PI * 85; // ~534
        const offset = circumference - (score / 100) * circumference;

        scoreRing.style.strokeDasharray = circumference;
        scoreRing.style.strokeDashoffset = offset;

        let level, label, color;
        if (score < 35) { level = 'human'; label = 'Likely Human-Written'; color = 'var(--aws-human)'; }
        else if (score < 65) { level = 'mixed'; label = 'Mixed — Some AI Patterns'; color = 'var(--aws-mixed)'; }
        else { level = 'ai'; label = 'Likely AI-Generated'; color = 'var(--aws-ai)'; }

        scoreRing.style.stroke = color;
        scoreNumber.textContent = score + '%';
        scoreNumber.className = 'score-number ' + level;
        scoreVerdict.textContent = label;
        scoreVerdict.className = 'score-verdict ' + level;

        // Breakdown chips
        let h = 0, m = 0, a = 0;
        sentences.forEach(s => {
            if (s.level === 'human') h++;
            else if (s.level === 'mixed') m++;
            else a++;
        });
        document.getElementById('chip-human').textContent = h;
        document.getElementById('chip-mixed').textContent = m;
        document.getElementById('chip-ai').textContent = a;

        // Disclaimer
        const disclaimer = document.getElementById('score-disclaimer');
        disclaimer.textContent = `Statistical analysis of ${sentences.length} sentence${sentences.length > 1 ? 's' : ''} — not a definitive verdict. Same text always produces the same score.`;
    }

    // ═══ INLINE HIGHLIGHTING ═══
    function updateHighlightLayer(sentences, fullText) {
        highlightLayer.innerHTML = '';

        let html = '';
        let remainder = fullText;

        sentences.forEach((s, i) => {
            const idx = remainder.indexOf(s.text);
            if (idx === -1) {
                html += `<span class="hl-sentence ${s.level}" data-idx="${i}">${escapeHtml(s.text)}</span>`;
                return;
            }

            // Add any leading whitespace/text before this sentence
            if (idx > 0) {
                html += escapeHtml(remainder.substring(0, idx));
            }

            // Wrap the sentence
            html += `<span class="hl-sentence ${s.level}" data-idx="${i}">${escapeHtml(s.text)}</span>`;
            remainder = remainder.substring(idx + s.text.length);
        });

        // Add any trailing text
        if (remainder) html += escapeHtml(remainder);

        highlightLayer.innerHTML = html;
    }

    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    // ═══ HEURISTICS ═══
    function updateHeuristics(heuristics) {
        heuristicList.innerHTML = '';

        const labels = {
            complexityVariance: 'Complexity Variance',
            burstiness: 'Burstiness',
            phraseDensity: 'AI Phrases',
            hedgingDensity: 'Hedging Language',
            listElaborate: 'Claim-to-Explain',
            vocabRichness: 'Vocab Richness',
            uniformity: 'Uniformity',
            punctuationDiversity: 'Punctuation',
            absenceSpecificity: 'Specificity'
        };

        Object.entries(heuristics).forEach(([key, val]) => {
            // val is an object: { score, rawScore, weight, detail, contribution }
            const scoreValue = (typeof val === 'object' && val !== null) ? val.score : val;
            const pct = Math.round((scoreValue || 0) * 100);
            const barClass = pct < 35 ? 'low' : pct < 65 ? 'mid' : 'high';
            const detail = (typeof val === 'object' && val.detail) ? val.detail : '';

            const row = document.createElement('div');
            row.className = 'heuristic-row';
            row.title = detail;
            row.innerHTML = `
                <span class="heuristic-name">${labels[key] || key}</span>
                <div class="heuristic-bar-bg"><div class="heuristic-bar ${barClass}" style="width:${pct}%"></div></div>
                <span class="heuristic-pct">${pct}%</span>
            `;
            heuristicList.appendChild(row);
        });
    }

    // ═══ POPOVER — Rich Detail Panel ═══
    function showPopover(e, sentence, idx) {
        closePopover();

        const pop = document.createElement('div');
        pop.className = 'sentence-popover';

        // Level info
        const levelLabel = sentence.level === 'human' ? 'Human-like' : sentence.level === 'mixed' ? 'Mixed' : 'AI Pattern';
        const color = sentence.level === 'human' ? 'var(--aws-human)' : sentence.level === 'mixed' ? 'var(--aws-mixed)' : 'var(--aws-ai)';

        // Show human confidence for human/mixed, AI confidence for AI
        const displayConf = sentence.level === 'ai' ? sentence.confidence : (100 - (sentence.confidence || 0));

        // Build reasons list
        const reasonsHtml = (sentence.reasons || [])
            .map(r => `<li>${r}</li>`)
            .join('');

        // Generate improvement tips based on reasons
        const tips = generateTips(sentence);

        pop.innerHTML = `
            <button class="pop-close" title="Close (Esc)">✕</button>
            <div class="pop-header">
                <span class="pop-score" style="color:${color}">${displayConf}%</span>
                <span class="pop-badge ${sentence.level}">${levelLabel}</span>
            </div>
            ${reasonsHtml ? `<div class="pop-section-title">Why this was flagged</div><ul class="pop-reasons">${reasonsHtml}</ul>` : ''}
            ${tips ? `<div class="pop-tip"><strong>💡 Tip:</strong> ${tips}</div>` : ''}
            <div class="pop-section-title">Sentence</div>
            <div class="pop-text">"${escapeHtml(sentence.text)}"</div>
            ${sentence.level !== 'human' ? `<button class="pop-humanize" title="AI rewriting coming in Pro">✨ Humanize This Sentence</button>` : ''}
        `;

        document.body.appendChild(pop);
        currentPopover = pop;

        // Position near the click
        requestAnimationFrame(() => {
            const rect = pop.getBoundingClientRect();
            const x = Math.min(e.clientX, window.innerWidth - rect.width - 20);
            const y = e.clientY + 15 > window.innerHeight - rect.height
                ? e.clientY - rect.height - 10
                : e.clientY + 15;
            pop.style.left = Math.max(10, x) + 'px';
            pop.style.top = Math.max(10, y) + 'px';
        });

        pop.querySelector('.pop-close').addEventListener('click', closePopover);

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler);
        }, 100);
    }

    function generateTips(sentence) {
        const reasons = (sentence.reasons || []).map(r => r.toLowerCase());
        const tips = [];

        if (reasons.some(r => r.includes('phrase') || r.includes('contains "'))) {
            tips.push('Replace commonly-flagged phrases like "it is important to note" with direct statements.');
        }
        if (reasons.some(r => r.includes('hedging') || r.includes('qualif'))) {
            tips.push('Remove hedge words like "arguably," "potentially," or "it could be said" — state claims directly.');
        }
        if (reasons.some(r => r.includes('similar length') || r.includes('uniform'))) {
            tips.push('Vary your sentence structure — mix short punchy statements with longer explanations.');
        }
        if (reasons.some(r => r.includes('specific') || r.includes('concrete'))) {
            tips.push('Add concrete details: names, dates, personal anecdotes, or specific examples.');
        }
        if (reasons.some(r => r.includes('passive'))) {
            tips.push('Rewrite in active voice — "The team built the feature" instead of "The feature was built."');
        }
        if (reasons.some(r => r.includes('vocabulary') || r.includes('vocab') || r.includes('complexity'))) {
            tips.push('Use more varied word choices instead of repeating the same terms.');
        }

        if (sentence.level === 'ai' && tips.length === 0) {
            tips.push('Try rewriting this sentence in your own voice — add a personal perspective or specific detail.');
        }
        if (sentence.level === 'mixed' && tips.length === 0) {
            tips.push('This sentence has some AI-like patterns but isn\'t strongly flagged. Consider adding a specific example or personal touch.');
        }

        return tips.length > 0 ? tips[0] : '';
    }

    function outsideClickHandler(e) {
        if (currentPopover && !currentPopover.contains(e.target)) {
            closePopover();
        }
    }

    function closePopover() {
        if (currentPopover) {
            currentPopover.remove();
            currentPopover = null;
        }
        document.removeEventListener('click', outsideClickHandler);
    }

    // ═══ DASHBOARD CARDS ═══
    function updateDashboardCards(text, result) {
        // Readability — call detector API
        readabilityCard.style.display = 'block';
        const r = AIDetector.readability(text);
        readabilityContent.innerHTML = `
            <div class="stat-row"><span class="stat-label">Grade Level</span><span class="stat-value">${r.gradeLevel || 'N/A'}</span></div>
            <div class="stat-divider"></div>
            <div class="stat-row"><span class="stat-label">Avg Sentence Length</span><span class="stat-value">${r.avgSentenceLength || '—'} words</span></div>
            <div class="stat-divider"></div>
            <div class="stat-row"><span class="stat-label">Avg Syllables/Word</span><span class="stat-value">${r.avgSyllables || '—'}</span></div>
            <div class="stat-divider"></div>
            <div class="stat-row"><span class="stat-label">Flesch Score</span><span class="stat-value">${r.fleschKincaid || 0}/100</span></div>
        `;

        // Tone — call detector API
        toneCard.style.display = 'block';
        const t = AIDetector.analyzeTone(text);
        toneContent.innerHTML = `
            <div class="stat-row"><span class="stat-label">Primary Tone</span><span class="stat-value">${t.primary || 'Neutral'}</span></div>
            <div class="stat-divider"></div>
            <div class="stat-row"><span class="stat-label">Confidence</span><span class="stat-value">${t.confidence || 'N/A'}</span></div>
        `;

        // Passive Voice — call detector API
        passiveCard.style.display = 'block';
        const sentences = AIDetector.splitSentences(text);
        const p = AIDetector.detectPassiveVoice(sentences);
        const pPct = p.percentage || 0;
        const pClass = pPct < 10 ? 'good' : pPct < 20 ? 'warn' : 'bad';
        passiveContent.innerHTML = `
            <div class="stat-row"><span class="stat-label">Passive sentences</span><span class="stat-value">${p.count || 0} / ${p.total || 0}</span></div>
            <div class="passive-meter">
                <div class="passive-bar-bg"><div class="passive-bar ${pClass}" style="width:${pPct}%"></div></div>
                <span class="passive-pct">${Math.round(pPct)}%</span>
            </div>
            <div style="font-size:0.72rem;color:var(--aws-text-dim);margin-top:0.35rem;">${pPct < 10 ? 'Great — minimal passive voice' : pPct < 20 ? 'Acceptable level' : 'Consider reducing passive constructions'}</div>
        `;

        // Repetition — call detector API
        repetitionCard.style.display = 'block';
        const rep = AIDetector.detectRepetition(text);
        const repWords = rep.repeatedWords || [];
        if (repWords.length === 0) {
            repetitionContent.innerHTML = '<div style="font-size:0.82rem;color:var(--aws-text-dim);">No overused words detected ✓</div>';
        } else {
            repetitionContent.innerHTML = repWords.slice(0, 5).map(w =>
                `<div class="rep-word"><span class="rep-word-text">"${w.word}"</span><span class="rep-word-count">${w.count}×</span></div>`
            ).join('');
        }
    }

    // ═══ RESET ═══
    function resetUI() {
        scoreEmpty.style.display = 'flex';
        scoreActive.style.display = 'none';
        legendBar.style.display = 'none';
        highlightLayer.innerHTML = '';
        readabilityCard.style.display = 'none';
        toneCard.style.display = 'none';
        passiveCard.style.display = 'none';
        repetitionCard.style.display = 'none';
        wordCountEl.textContent = '0';
        sentenceCountEl.textContent = '0';
        readingTimeEl.textContent = '0m';
        charCountEl.textContent = '0';
        heuristicList.innerHTML = '';
        heuristicList.classList.remove('open');
        heuristicsToggle.classList.remove('open');
        heuristicsToggle.textContent = 'View Technical Details';
        lastResult = null;
    }

    // ═══ REPORT MODAL ═══
    function showReportModal() {
        const overlay = document.createElement('div');
        overlay.className = 'report-modal-overlay';
        overlay.innerHTML = `
            <div class="report-modal">
                <h3>Report Inaccurate Result</h3>
                <div class="radio-group">
                    <label><input type="radio" name="report-reason" value="false-ai"> Flagged as AI but I wrote it myself</label>
                    <label><input type="radio" name="report-reason" value="false-human"> Missed AI content that I know is AI</label>
                    <label><input type="radio" name="report-reason" value="other"> Other issue</label>
                </div>
                <textarea placeholder="Any additional details? (optional)"></textarea>
                <div class="modal-actions">
                    <button class="btn-cancel" id="report-cancel">Cancel</button>
                    <button class="btn-submit" id="report-submit">Submit Report</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#report-cancel').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#report-submit').addEventListener('click', () => {
            overlay.remove();
            showToast('Thank you — your feedback helps improve detection accuracy.');
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // ═══ TOAST ═══
    function showToast(message) {
        const existing = document.querySelector('.autosave-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'autosave-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ═══ AUTO-SAVE INDICATOR ═══
    textarea.addEventListener('input', () => {
        clearTimeout(window._saveTimer);
        window._saveTimer = setTimeout(() => {
            localStorage.setItem('aws_draft', textarea.value);
        }, 2000);
    });
});

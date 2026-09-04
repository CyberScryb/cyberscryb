/**
 * CyberScryb AI Writing Suite — Detection Engine
 * 100% client-side. Your text never leaves your browser.
 *
 * 9 weighted heuristics scored 0-1, combined into composite 0-100%.
 * All metric names are honest labels — no academic overselling.
 */

const AIDetector = (() => {
  'use strict';

  // ── Remote AI Phrase Dictionary (fetched, updatable without redeploy) ──
  let AI_PHRASES = [];
  let phraseDictVersion = 'Loading...';

  // Fallback phrases if remote fetch fails
  const FALLBACK_PHRASES = [
    'it is worth noting',
    'it is important to note',
    'in conclusion',
    'furthermore',
    'moreover',
    'additionally',
    "in today's digital age",
    'in this article',
    "let's dive in",
    'without further ado',
    'it goes without saying',
    'needless to say',
    'at the end of the day',
    'in the realm of',
    'it is crucial to',
    'it should be noted that',
    'as we delve into',
    'the landscape of',
    'a testament to',
    'plays a crucial role',
    'navigating the complexities',
    'shed light on',
    'in the ever-evolving',
    'on the other hand',
    'having said that',
    'with that being said',
    'it is essential to',
    'it is imperative',
    'serves as a reminder',
    'in light of',
    'paving the way',
    'a myriad of',
    'a plethora of',
    'harness the power',
    'leverage the potential',
    'unlock the potential',
    'revolutionize the way',
    'foster a culture of',
    'embark on a journey',
    'tapestry of',
    'multifaceted',
    'holistic approach',
    'paradigm shift',
    'synergy',
    'cutting-edge',
    'game-changer',
    'groundbreaking',
    'transformative',
    'in summary',
    'to summarize',
    'in essence',
    'delve into',
    'delve deeper',
    'intricacies of',
    'nuances of',
  ];

  // Hedging patterns (2026 AI signal — structural, not vocabulary)
  const HEDGING_PATTERNS = [
    /\bit('s| is) important to (note|remember|understand|consider|recognize)\b/gi,
    /\bwhile (there are|it is|this|these) (many|several|various|numerous)\b/gi,
    /\bit should be noted that\b/gi,
    /\bit('s| is) worth (noting|mentioning|considering|pointing out)\b/gi,
    /\bhowever,? it('s| is)\b/gi,
    /\bthat (being|said|noted)\b/gi,
    /\bin (many|some|certain|various) (cases|situations|instances|contexts)\b/gi,
    /\bgenerally speaking\b/gi,
    /\bas (a|one) might expect\b/gi,
    /\bit (can|could|may|might) be argued\b/gi,
    /\bto (some|a certain|a large) (extent|degree)\b/gi,
    /\bon the (one|other) hand\b/gi,
    /\bnevertheless\b/gi,
    /\bnonetheless\b/gi,
    /\bregardless of\b/gi,
  ];

  // ── Load remote phrase dictionary ──
  async function loadPhraseDictionary() {
    try {
      const resp = await fetch('/data/ai-phrases.json');
      if (resp.ok) {
        const data = await resp.json();
        AI_PHRASES = data.phrases || [];
        phraseDictVersion = data.version || 'Unknown';
      } else {
        throw new Error('Fetch failed');
      }
    } catch {
      AI_PHRASES = FALLBACK_PHRASES;
      phraseDictVersion = 'Built-in (offline)';
    }
  }

  // ── Utility: Split text into sentences ──
  function splitSentences(text) {
    if (!text.trim()) return [];
    // Handle common abbreviations
    const cleaned = text
      .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|i\.e|e\.g)\./gi, '$1\u2024')
      .replace(/\.\.\./g, '\u2026');

    const raw = cleaned.split(/(?<=[.!?])\s+/);
    return raw
      .map(s =>
        s
          .replace(/\u2024/g, '.')
          .replace(/\u2026/g, '...')
          .trim()
      )
      .filter(s => s.length > 0);
  }

  // ── Utility: Count syllables ──
  function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 2) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const m = word.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }

  // ── Utility: Standard deviation ──
  function stdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  // ── Writing Style Weight Modifiers ──
  const STYLE_MODIFIERS = {
    auto: null, // determined from text
    casual: {
      complexityVariance: 1.0,
      burstiness: 1.3,
      phraseDensity: 1.0,
      hedgingDensity: 1.0,
      listElaborate: 1.0,
      vocabRichness: 1.0,
      uniformity: 1.0,
      punctuationDiversity: 1.3,
      absenceSpecificity: 1.0,
    },
    business: {
      complexityVariance: 0.8,
      burstiness: 1.0,
      phraseDensity: 1.0,
      hedgingDensity: 0.7,
      listElaborate: 0.8,
      vocabRichness: 1.0,
      uniformity: 0.7,
      punctuationDiversity: 1.0,
      absenceSpecificity: 1.0,
    },
    academic: {
      complexityVariance: 0.6,
      burstiness: 0.8,
      phraseDensity: 0.8,
      hedgingDensity: 0.6,
      listElaborate: 0.7,
      vocabRichness: 1.0,
      uniformity: 0.6,
      punctuationDiversity: 0.8,
      absenceSpecificity: 0.8,
    },
    legal: {
      complexityVariance: 0.5,
      burstiness: 0.7,
      phraseDensity: 0.7,
      hedgingDensity: 0.5,
      listElaborate: 0.6,
      vocabRichness: 0.8,
      uniformity: 0.5,
      punctuationDiversity: 0.7,
      absenceSpecificity: 0.7,
    },
    creative: {
      complexityVariance: 1.1,
      burstiness: 1.3,
      phraseDensity: 1.0,
      hedgingDensity: 1.1,
      listElaborate: 1.1,
      vocabRichness: 0.9,
      uniformity: 1.1,
      punctuationDiversity: 1.3,
      absenceSpecificity: 0.8,
    },
    technical: {
      complexityVariance: 0.6,
      burstiness: 0.8,
      phraseDensity: 0.9,
      hedgingDensity: 0.6,
      listElaborate: 0.7,
      vocabRichness: 0.9,
      uniformity: 0.6,
      punctuationDiversity: 0.8,
      absenceSpecificity: 0.9,
    },
  };

  // ── Auto-detect writing style from text ──
  function autoDetectStyle(text, sentences) {
    const lower = text.toLowerCase();
    const avgSentLen =
      sentences.reduce((s, sent) => s + sent.split(/\s+/).length, 0) /
      Math.max(sentences.length, 1);

    // Academic signals
    const academicSignals = (
      lower.match(
        /\b(hypothesis|methodology|findings|literature|abstract|conclusion|therefore|thus|hence|empirical|qualitative|quantitative)\b/g
      ) || []
    ).length;
    if (academicSignals >= 3) return 'academic';

    // Legal signals
    const legalSignals = (
      lower.match(
        /\b(pursuant|herein|thereof|whereas|notwithstanding|aforementioned|shall|stipulate|jurisdiction)\b/g
      ) || []
    ).length;
    if (legalSignals >= 2) return 'legal';

    // Technical signals
    const techSignals = (
      lower.match(
        /\b(function|api|database|server|algorithm|implementation|config|deploy|repository|framework|library)\b/g
      ) || []
    ).length;
    if (techSignals >= 3) return 'technical';

    // Creative signals
    if (text.match(/[""][^""]+[""]/g)?.length >= 3) return 'creative'; // dialogue
    const creativeSignals = (
      lower.match(/\b(whispered|sighed|gazed|murmured|trembled|shadows|moonlight|darkness)\b/g) ||
      []
    ).length;
    if (creativeSignals >= 2) return 'creative';

    // Business signals
    const bizSignals = (
      lower.match(
        /\b(roi|kpi|stakeholder|deliverable|revenue|pipeline|quarterly|strategy|metrics|growth)\b/g
      ) || []
    ).length;
    if (bizSignals >= 2) return 'business';

    // Default: if formal (long sentences), lean business; if informal, casual
    if (avgSentLen > 22) return 'business';
    return 'casual';
  }

  // ══════════════════════════════════════════════
  //  THE 9 HEURISTICS
  // ══════════════════════════════════════════════

  /**
   * 1. Complexity Variance (15%)
   * Measures standard deviation of syllable-weighted sentence complexity.
   * AI text = low variance (suspiciously consistent). Human = high variance.
   */
  function heuristicComplexityVariance(sentences) {
    if (sentences.length < 3) return { score: 0.5, detail: 'Too few sentences to measure' };
    const complexities = sentences.map(s => {
      const words = s.split(/\s+/);
      const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
      return totalSyllables / Math.max(words.length, 1);
    });
    const sd = stdDev(complexities);
    // Low SD = suspicious. AI typically has SD 0.10-0.25. Human: 0.30+
    const score = Math.max(0, Math.min(1, 1 - (sd - 0.08) / 0.35));
    return { score, detail: `Complexity std dev: ${sd.toFixed(3)}` };
  }

  /**
   * 2. Burstiness Score (12%)
   * Sentence length standard deviation. Humans vary wildly, AI stays in a narrow band.
   */
  function heuristicBurstiness(sentences) {
    if (sentences.length < 3) return { score: 0.5, detail: 'Too few sentences' };
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const sd = stdDev(lengths);
    // Low SD = AI-like. AI typically has SD 3-6, humans 8+
    const score = Math.max(0, Math.min(1, 1 - (sd - 1.5) / 8));
    return { score, detail: `Length std dev: ${sd.toFixed(1)} words` };
  }

  /**
   * 3. AI Phrase Density (12%)
   * Dictionary match against remotely-fetched phrase list.
   */
  function heuristicPhraseDensity(text, wordCount) {
    if (wordCount < 20) return { score: 0, detail: 'Text too short' };
    const lower = text.toLowerCase();
    let matchCount = 0;
    const matches = [];
    for (const phrase of AI_PHRASES) {
      const idx = lower.indexOf(phrase.toLowerCase());
      if (idx !== -1) {
        matchCount++;
        matches.push(phrase);
      }
    }
    // Normalize: even 1-2 matches per 100 words is suspicious
    const density = matchCount / (wordCount / 200);
    const score = Math.max(0, Math.min(1, density / 2.5));
    return { score, detail: `${matchCount} AI phrases found`, matches };
  }

  /**
   * 4. Hedging Density (12%)
   * Over-qualification patterns. AI over-hedges.
   */
  function heuristicHedging(text, wordCount) {
    if (wordCount < 30) return { score: 0, detail: 'Text too short' };
    let hedgeCount = 0;
    for (const pattern of HEDGING_PATTERNS) {
      const m = text.match(pattern);
      if (m) hedgeCount += m.length;
    }
    const density = hedgeCount / (wordCount / 200);
    const score = Math.max(0, Math.min(1, density / 2));
    return { score, detail: `${hedgeCount} hedging patterns found` };
  }

  /**
   * 5. List-then-Elaborate Ratio (10%)
   * AI tends to state → explain in lockstep. Humans interleave.
   */
  function heuristicListElaborate(sentences) {
    if (sentences.length < 4) return { score: 0.3, detail: 'Too few sentences' };
    let pairCount = 0;
    for (let i = 0; i < sentences.length - 1; i++) {
      const curr = sentences[i];
      const next = sentences[i + 1];
      const currWords = curr.split(/\s+/).length;
      const nextWords = next.split(/\s+/).length;
      // Pattern: short assertion (< 15 words) followed by longer explanation (> 20 words)
      if (currWords < 15 && nextWords > 18 && nextWords > currWords * 1.4) {
        pairCount++;
      }
    }
    const ratio = pairCount / Math.max(sentences.length / 2, 1);
    const score = Math.max(0, Math.min(1, ratio / 0.4));
    return { score, detail: `${pairCount} claim→explain pairs` };
  }

  /**
   * 6. Vocabulary Richness (10%)
   * Type-token ratio. AI reuses words more uniformly.
   */
  function heuristicVocabRichness(text, wordCount) {
    if (wordCount < 20) return { score: 0.5, detail: 'Text too short' };
    const words = text.toLowerCase().match(/[a-z']+/g) || [];
    const unique = new Set(words);
    const ttr = unique.size / Math.max(words.length, 1);
    // For texts > 200 words, a TTR > 0.65 is human-like, < 0.50 is AI-like
    // For shorter texts, TTR is naturally higher, so adjust
    const adjustedTTR = wordCount > 200 ? ttr : ttr * 0.85;
    // High TTR = human (low score). Low TTR = AI-like (high score).
    // AI typically has TTR 0.45-0.58, humans 0.60+
    const score = Math.max(0, Math.min(1, (0.68 - adjustedTTR) / 0.22));
    return {
      score,
      detail: `TTR: ${ttr.toFixed(3)} (${unique.size} unique / ${words.length} total)`,
    };
  }

  /**
   * 7. Paragraph/Sentence Uniformity (10%)
   * AI produces suspiciously uniform paragraphs and repetitive S-V-O patterns.
   */
  function heuristicUniformity(text, sentences) {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    let paraScore = 0.5;
    if (paragraphs.length >= 3) {
      const paraLengths = paragraphs.map(p => p.split(/\s+/).length);
      const sd = stdDev(paraLengths);
      const mean = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
      const cv = mean > 0 ? sd / mean : 0; // coefficient of variation
      // Low CV = uniform = suspicious. CV < 0.15 → very AI, CV > 0.5 → human
      paraScore = Math.max(0, Math.min(1, 1 - (cv - 0.1) / 0.45));
    }

    // Sentence start patterns
    let sentScore = 0.5;
    if (sentences.length >= 5) {
      const starts = sentences.map(s => {
        const words = s.trim().split(/\s+/);
        return words.slice(0, 2).join(' ').toLowerCase();
      });
      const startFreq = {};
      starts.forEach(s => {
        startFreq[s] = (startFreq[s] || 0) + 1;
      });
      const maxRepeat = Math.max(...Object.values(startFreq));
      const repeatRatio = maxRepeat / sentences.length;
      // High repeat ratio = AI-like
      sentScore = Math.max(0, Math.min(1, repeatRatio / 0.3));
    }

    const score = paraScore * 0.6 + sentScore * 0.4;
    return {
      score,
      detail: `Para uniformity: ${paraScore.toFixed(2)}, Start patterns: ${sentScore.toFixed(2)}`,
    };
  }

  /**
   * 8. Punctuation & Register Diversity (9%)
   * AI underuses semicolons, dashes, parentheses, exclamations.
   * Also measures register shift within paragraphs.
   */
  function heuristicPunctuationDiversity(text, wordCount) {
    if (wordCount < 30) return { score: 0.3, detail: 'Text too short' };
    const punctCounts = {
      semicolons: (text.match(/;/g) || []).length,
      dashes: (text.match(/[—–-]{2,}|—/g) || []).length,
      parentheses: (text.match(/[()]/g) || []).length / 2,
      exclamations: (text.match(/!/g) || []).length,
      questions: (text.match(/\?/g) || []).length,
      colons: (text.match(/:/g) || []).length,
    };
    const totalDiverse = Object.values(punctCounts).reduce((a, b) => a + b, 0);
    const diversityRatio = totalDiverse / (wordCount / 100);
    // Low diversity = AI-like. 0 diverse punct per 100 words → suspicious
    const punctScore = Math.max(0, Math.min(1, 1 - diversityRatio / 4));

    // Register consistency check (emotional temperature uniformity)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    let registerScore = 0.5;
    if (paragraphs.length >= 2) {
      const paraFormality = paragraphs.map(p => {
        const words = p.toLowerCase().split(/\s+/);
        const formal = words.filter(w => w.length > 8).length / Math.max(words.length, 1);
        return formal;
      });
      const regSD = stdDev(paraFormality);
      // Low register variance = AI (uniform emotional temp)
      registerScore = Math.max(0, Math.min(1, 1 - regSD / 0.08));
    }

    const score = punctScore * 0.6 + registerScore * 0.4;
    return {
      score,
      detail: `Diverse punct: ${totalDiverse}, Register variance: ${registerScore.toFixed(2)}`,
    };
  }

  /**
   * 9. Absence of Specificity (10%)
   * AI avoids concrete personal anecdotes, specific names, places, times.
   * Uses proper noun density + first-person + concrete number/date patterns as proxy for NER.
   *
   * NOTE: This is the trickiest heuristic. If it feels brittle, reduce weight.
   */
  function heuristicAbsenceSpecificity(text, sentences, wordCount) {
    if (wordCount < 30) return { score: 0.3, detail: 'Text too short' };

    // Proper noun density (capitalized words not at sentence start)
    let properNouns = 0;
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      for (let i = 1; i < words.length; i++) {
        // skip first word
        const w = words[i].replace(/[^a-zA-Z]/g, '');
        if (w.length > 1 && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase()) {
          properNouns++;
        }
      }
    }
    const properNounDensity = properNouns / (wordCount / 100);

    // First-person specificity
    const firstPerson = (text.match(/\b(I |my |me |I'm |I've |I'd |I'll |mine )/gi) || []).length;
    const firstPersonDensity = firstPerson / (wordCount / 100);

    // Concrete numbers and dates
    const concreteNumbers = (
      text.match(
        /\b\d{1,4}[%$€£]|\b\d{1,2}:\d{2}\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/gi
      ) || []
    ).length;
    const specificNumbers = (text.match(/\b\d{2,}\b/g) || []).length;
    const concreteDensity = (concreteNumbers + specificNumbers * 0.5) / (wordCount / 100);

    // Combine: low specificity = AI-like
    const totalSpecificity =
      properNounDensity * 0.4 + firstPersonDensity * 0.3 + concreteDensity * 0.3;
    // No specificity → score 1 (AI). High specificity → score 0 (human).
    const score = Math.max(0, Math.min(1, 1 - totalSpecificity / 3));

    return {
      score,
      detail: `Proper nouns: ${properNouns}, First-person: ${firstPerson}, Concrete: ${concreteNumbers + specificNumbers}`,
      confidence: properNouns > 3 || firstPerson > 2 ? 'high' : 'low',
    };
  }

  // ══════════════════════════════════════════════
  //  MAIN ANALYSIS
  // ══════════════════════════════════════════════

  const WEIGHTS = {
    complexityVariance: 0.15,
    burstiness: 0.12,
    phraseDensity: 0.12,
    hedgingDensity: 0.12,
    listElaborate: 0.1,
    vocabRichness: 0.1,
    uniformity: 0.1,
    punctuationDiversity: 0.09,
    absenceSpecificity: 0.1,
  };

  /**
   * Analyze text for AI-generated content patterns.
   * @param {string} text - The text to analyze
   * @param {string} writingStyle - 'auto', 'casual', 'business', 'academic', 'legal', 'creative', 'technical'
   * @returns {object} Analysis results with overall score and per-heuristic breakdown
   */
  function analyze(text, writingStyle = 'auto') {
    const trimmed = text.trim();
    if (!trimmed) {
      return { score: 0, sentences: [], heuristics: {}, disclaimer: '', wordCount: 0 };
    }

    const sentences = splitSentences(trimmed);
    const words = trimmed.split(/\s+/);
    const wordCount = words.length;

    // Determine style modifiers
    const detectedStyle =
      writingStyle === 'auto' ? autoDetectStyle(trimmed, sentences) : writingStyle;
    const modifiers = STYLE_MODIFIERS[detectedStyle] || STYLE_MODIFIERS['casual'];

    // Run all heuristics
    const raw = {
      complexityVariance: heuristicComplexityVariance(sentences),
      burstiness: heuristicBurstiness(sentences),
      phraseDensity: heuristicPhraseDensity(trimmed, wordCount),
      hedgingDensity: heuristicHedging(trimmed, wordCount),
      listElaborate: heuristicListElaborate(sentences),
      vocabRichness: heuristicVocabRichness(trimmed, wordCount),
      uniformity: heuristicUniformity(trimmed, sentences),
      punctuationDiversity: heuristicPunctuationDiversity(trimmed, wordCount),
      absenceSpecificity: heuristicAbsenceSpecificity(trimmed, sentences, wordCount),
    };

    // Apply style modifiers and weights
    let compositeScore = 0;
    const heuristics = {};
    for (const [key, result] of Object.entries(raw)) {
      const modifier = modifiers ? modifiers[key] || 1.0 : 1.0;
      const adjustedScore = Math.max(0, Math.min(1, result.score * modifier));
      const weight = WEIGHTS[key];
      compositeScore += adjustedScore * weight;
      heuristics[key] = {
        score: adjustedScore,
        rawScore: result.score,
        weight,
        detail: result.detail,
        contribution: adjustedScore * weight,
        matches: result.matches || null,
        confidence: result.confidence || null,
      };
    }

    // Normalize to 0-100 with non-linear boost to push AI content higher
    // Raw composite is 0-1. Apply a power curve that amplifies mid-high signals.
    const rawPct = compositeScore * 100;
    // Boost: if raw >= 30, apply gentle exponential push upward
    const boosted = rawPct < 25 ? rawPct : rawPct + (rawPct - 25) * 0.4;
    const finalScore = Math.round(Math.max(0, Math.min(100, boosted)));

    // Generate per-sentence scores (subset of heuristics)
    const sentenceScores = sentences.map((sentence, i) => {
      const sentWords = sentence.split(/\s+/);
      const sentWordCount = sentWords.length;

      // Mini analysis per sentence
      let sentScore = 0;
      let reasons = [];

      // Complexity (syllable density)
      const syllables = sentWords.reduce((sum, w) => sum + countSyllables(w), 0);
      const avgSyl = syllables / Math.max(sentWordCount, 1);

      // Phrase matches
      const lower = sentence.toLowerCase();
      let phraseHits = 0;
      for (const phrase of AI_PHRASES) {
        if (lower.includes(phrase.toLowerCase())) {
          phraseHits++;
          reasons.push(`Contains "${phrase}"`);
        }
      }
      if (phraseHits > 0) sentScore += 0.35;

      // Hedging in this sentence
      let hedgeHits = 0;
      for (const pattern of HEDGING_PATTERNS) {
        if (pattern.test(sentence)) {
          hedgeHits++;
          pattern.lastIndex = 0; // reset regex
        }
      }
      if (hedgeHits > 0) {
        sentScore += 0.25;
        reasons.push('Hedging language detected');
      }

      // Length uniformity check (compare to neighbors)
      if (i > 0 && i < sentences.length - 1) {
        const prevLen = sentences[i - 1].split(/\s+/).length;
        const nextLen = sentences[i + 1].split(/\s+/).length;
        const diff = Math.abs(sentWordCount - prevLen) + Math.abs(sentWordCount - nextLen);
        if (diff < 6) {
          sentScore += 0.15;
          reasons.push('Very similar length to neighbors');
        }
      }

      // Vocabulary check (all common words)
      const uncommonWords = sentWords.filter(w => w.replace(/[^a-z]/gi, '').length > 8).length;
      const complexRatio = uncommonWords / Math.max(sentWordCount, 1);
      if (complexRatio < 0.08 && sentWordCount > 10) {
        sentScore += 0.12;
        reasons.push('Low vocabulary complexity');
      }

      // Starts with common AI opener / transition
      const startsWithAI =
        /^(In |This |The |It |These |Those |However,? |Moreover,? |Furthermore,? |Additionally,? |As |While |Although )/i.test(
          sentence
        );
      if (startsWithAI && sentWordCount > 12) {
        sentScore += 0.12;
        reasons.push('Formulaic sentence opener');
      }

      // Long, complex sentence without personal voice (AI signal)
      const hasFirstPerson = /\b(I |I'm |I've |my |me )\b/i.test(sentence);
      if (sentWordCount > 20 && !hasFirstPerson && avgSyl > 1.6) {
        sentScore += 0.1;
        reasons.push('Long impersonal sentence with high syllable density');
      }

      // Passive voice in this sentence
      const passivePattern =
        /\b(is|are|was|were|be|been|being)\s+(\w+ed|written|taken|given|shown|known|seen|made|found|done)\b/i;
      if (passivePattern.test(sentence) && sentWordCount > 10) {
        sentScore += 0.08;
        reasons.push('Passive voice construction');
      }

      const confidence = Math.round(Math.max(0, Math.min(100, sentScore * 120)));

      // Classification — lowered thresholds to catch more AI
      let level = 'human'; // ● green
      if (confidence >= 45)
        level = 'ai'; // ◆ red
      else if (confidence >= 20) level = 'mixed'; // ▲ yellow

      return {
        text: sentence,
        index: i,
        confidence,
        level,
        reasons,
      };
    });

    // Disclaimer based on score
    let disclaimer = '';
    if (finalScore <= 40) {
      disclaimer = 'This text shows mostly human patterns across our analysis.';
    } else if (finalScore <= 60) {
      disclaimer =
        'Mixed signals — this text has some AI-like patterns but may be human-written formal text. Consider using the writing style selector for better accuracy.';
    } else if (finalScore <= 80) {
      disclaimer = 'Several AI patterns detected. Review the flagged sentences for details.';
    } else {
      disclaimer = 'Strong AI patterns detected across multiple indicators.';
    }

    return {
      score: finalScore,
      sentences: sentenceScores,
      heuristics,
      disclaimer,
      wordCount,
      detectedStyle,
      phraseDictVersion,
    };
  }

  // ── Readability Metrics ──
  function readability(text) {
    const sentences = splitSentences(text);
    const words = text
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0);
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);

    if (wordCount === 0 || sentenceCount === 0) {
      return {
        fleschKincaid: 0,
        gradeLevel: 'N/A',
        avgSentenceLength: 0,
        avgSyllables: 0,
        readingTime: '0m',
      };
    }

    const avgSentLen = wordCount / sentenceCount;
    const avgSyllables = syllableCount / wordCount;

    // Flesch Reading Ease
    const flesch = 206.835 - 1.015 * avgSentLen - 84.6 * avgSyllables;
    const fleschClamped = Math.max(0, Math.min(100, Math.round(flesch)));

    // Flesch-Kincaid Grade Level
    const gradeRaw = 0.39 * avgSentLen + 11.8 * avgSyllables - 15.59;
    const grade = Math.max(1, Math.round(gradeRaw));

    let gradeLabel = '';
    if (grade <= 5) gradeLabel = 'Elementary';
    else if (grade <= 8) gradeLabel = 'Middle School';
    else if (grade <= 12) gradeLabel = 'High School';
    else if (grade <= 16) gradeLabel = 'College';
    else gradeLabel = 'Graduate+';

    return {
      fleschKincaid: fleschClamped,
      gradeLevel: `Grade ${grade} (${gradeLabel})`,
      avgSentenceLength: Math.round(avgSentLen * 10) / 10,
      avgSyllables: Math.round(avgSyllables * 100) / 100,
      readingTime: Math.max(1, Math.ceil(wordCount / 200)) + 'm',
    };
  }

  // ── Tone Analysis ──
  function analyzeTone(text) {
    const lower = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 10) return { primary: 'Neutral', confidence: 'low' };

    const tones = {
      Formal: (
        lower.match(
          /\b(therefore|consequently|furthermore|moreover|nevertheless|notwithstanding|pursuant|hereby|accordingly)\b/g
        ) || []
      ).length,
      Conversational: (
        lower.match(
          /\b(you|your|you're|let's|we|gonna|wanna|kinda|pretty much|honestly|basically|actually|literally)\b/g
        ) || []
      ).length,
      Persuasive: (
        lower.match(
          /\b(should|must|need to|have to|essential|critical|important|vital|proven|guaranteed|don't miss)\b/g
        ) || []
      ).length,
      Informational: (
        lower.match(
          /\b(according to|research|study|data|statistics|evidence|report|analysis|survey|findings)\b/g
        ) || []
      ).length,
      Emotional: (
        lower.match(
          /\b(love|hate|amazing|terrible|incredible|awful|wonderful|horrible|passionate|devastating|heartbreaking|thrilling)\b/g
        ) || []
      ).length,
    };

    const max = Math.max(...Object.values(tones));
    if (max === 0) return { primary: 'Neutral', confidence: 'low' };

    const primary = Object.entries(tones).find(([, v]) => v === max)[0];
    return { primary, confidence: max >= 3 ? 'high' : 'medium', breakdown: tones };
  }

  // ── Passive Voice Detection ──
  function detectPassiveVoice(sentences) {
    const passivePattern =
      /\b(is|are|was|were|be|been|being)\s+(\w+ed|written|taken|given|shown|known|seen|made|found|done|gone|broken|chosen|driven|eaten|fallen|forgotten|frozen|gotten|hidden|ridden|risen|spoken|stolen|sworn|thrown|worn|woven)\b/gi;
    let passiveCount = 0;
    const passiveSentences = [];

    sentences.forEach((s, i) => {
      if (passivePattern.test(s)) {
        passiveCount++;
        passiveSentences.push(i);
      }
      passivePattern.lastIndex = 0;
    });

    return {
      count: passiveCount,
      total: sentences.length,
      percentage: sentences.length > 0 ? Math.round((passiveCount / sentences.length) * 100) : 0,
      indices: passiveSentences,
    };
  }

  // ── Repetition Detection ──
  function detectRepetition(text) {
    const words = text.toLowerCase().match(/[a-z']+/g) || [];
    if (words.length < 20) return { repeatedWords: [], overusedPhrases: [] };

    const stopWords = new Set([
      'the',
      'is',
      'at',
      'which',
      'on',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'to',
      'of',
      'for',
      'it',
      'that',
      'this',
      'with',
      'as',
      'was',
      'are',
      'be',
      'by',
      'from',
      'has',
      'he',
      'she',
      'they',
      'we',
      'you',
      'do',
      'not',
      'can',
      'will',
      'its',
      'my',
      'their',
      'our',
      'your',
      'his',
      'her',
      'i',
      'me',
      'have',
      'had',
      'been',
      'would',
      'could',
      'should',
      'about',
      'each',
      'more',
      'some',
      'them',
      'than',
      'when',
      'who',
      'what',
      'how',
      'all',
      'there',
      'then',
      'so',
      'if',
      'just',
      'also',
    ]);

    const freq = {};
    words.forEach(w => {
      if (w.length > 3 && !stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });

    const overused = Object.entries(freq)
      .filter(([, count]) => count >= 3 && count / words.length > 0.01)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count, pct: ((count / words.length) * 100).toFixed(1) }));

    // Bigram repetition
    const bigrams = {};
    for (let i = 0; i < words.length - 1; i++) {
      if (!stopWords.has(words[i]) || !stopWords.has(words[i + 1])) {
        const bi = `${words[i]} ${words[i + 1]}`;
        bigrams[bi] = (bigrams[bi] || 0) + 1;
      }
    }
    const repeatedPhrases = Object.entries(bigrams)
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([phrase, count]) => ({ phrase, count }));

    return { repeatedWords: overused, overusedPhrases: repeatedPhrases };
  }

  // ── Public API ──
  return {
    init: loadPhraseDictionary,
    analyze,
    readability,
    analyzeTone,
    detectPassiveVoice,
    detectRepetition,
    splitSentences,
    getPhraseDictVersion: () => phraseDictVersion,
  };
})();

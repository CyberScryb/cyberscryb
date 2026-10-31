/* grant-vault.js — shared client-side layer for the CyberScryb grants suite.
 *
 * Everything here lives on the user's device (localStorage). No network,
 * no accounts. Used by:
 *   - small-business-funding-finder  (eligibility quiz, "Track" buttons)
 *   - ai-grant-application-writer    (business profile vault, doc checklist)
 *   - grant-application-tracker      (pipeline, deadline radar, reminders)
 *
 * HARD RULE, restated for every consumer: the AI drafts and organizes;
 * the user logs in and submits on the funder's own portal. Nothing here
 * ever submits anything anywhere.
 */
(function () {
  'use strict';

  var LS = {
    profile: 'cs_grant_profile',
    pipeline: 'cs_grant_pipeline',
    reminders: 'cs_grant_reminders',
    docsPrefix: 'cs_grant_docs_',
    quiz: 'cs_grant_quiz',
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false; // private mode / quota
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function entries() {
    var d = window.CS_GRANTS;
    return d && d.entries ? d.entries : [];
  }

  function findOpportunity(id) {
    var list = entries();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  // ── Business profile vault ────────────────────────────────────
  var PROFILE_FIELDS = [
    'business_name',
    'business_type',
    'city_state',
    'employees',
    'annual_revenue',
    'mission',
    'contact_name',
    'contact_email',
    'contact_phone',
    'website',
    'founded_year',
  ];

  var profile = {
    fields: PROFILE_FIELDS,
    get: function () {
      return read(LS.profile, {});
    },
    save: function (obj) {
      var clean = {};
      PROFILE_FIELDS.forEach(function (f) {
        if (obj && obj[f] != null) clean[f] = String(obj[f]);
      });
      return write(LS.profile, clean);
    },
    clear: function () {
      try {
        localStorage.removeItem(LS.profile);
      } catch (e) {}
    },
    isEmpty: function () {
      var p = this.get();
      return !PROFILE_FIELDS.some(function (f) {
        return p[f] && String(p[f]).trim() !== '';
      });
    },
  };

  // ── Application pipeline tracker ──────────────────────────────
  var STAGES = ['saved', 'drafting', 'applied', 'pending', 'won'];
  var STAGE_LABELS = {
    saved: 'Saved',
    drafting: 'Drafting',
    applied: 'Applied',
    pending: 'Pending decision',
    won: 'Won',
  };

  var pipeline = {
    stages: STAGES,
    labels: STAGE_LABELS,
    list: function () {
      var arr = read(LS.pipeline, []);
      return Array.isArray(arr) ? arr : [];
    },
    save: function (arr) {
      return write(LS.pipeline, arr);
    },
    has: function (oppId) {
      return this.list().some(function (e) {
        return e.oppId === oppId;
      });
    },
    add: function (oppId, stage) {
      var arr = this.list();
      if (
        arr.some(function (e) {
          return e.oppId === oppId;
        })
      )
        return false;
      arr.unshift({
        oppId: oppId,
        stage: STAGES.indexOf(stage) >= 0 ? stage : 'saved',
        notes: '',
        updatedAt: new Date().toISOString(),
      });
      this.save(arr);
      return true;
    },
    move: function (oppId, stage) {
      var arr = this.list();
      var changed = false;
      arr.forEach(function (e) {
        if (e.oppId === oppId && STAGES.indexOf(stage) >= 0) {
          e.stage = stage;
          e.updatedAt = new Date().toISOString();
          changed = true;
        }
      });
      if (changed) this.save(arr);
      return changed;
    },
    note: function (oppId, notes) {
      var arr = this.list();
      arr.forEach(function (e) {
        if (e.oppId === oppId) {
          e.notes = String(notes || '');
          e.updatedAt = new Date().toISOString();
        }
      });
      this.save(arr);
    },
    remove: function (oppId) {
      this.save(
        this.list().filter(function (e) {
          return e.oppId !== oppId;
        })
      );
    },
  };

  // ── Deadline parsing ──────────────────────────────────────────
  var MONTHS = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sept: 8,
    sep: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  };

  // Returns { kind: 'date'|'rolling'|'closed'|'unknown', date: Date|null, label: string }
  function parseDeadline(str) {
    var s = String(str || '');
    if (/closed/i.test(s)) return { kind: 'closed', date: null, label: s };
    if (/rolling/i.test(s))
      return { kind: 'rolling', date: null, label: 'Rolling — apply anytime' };
    var m = s.match(
      /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\w*\s+(\d{1,2})(?:\s*,\s*|\s+)(\d{4})\b/i
    );
    if (m) {
      var d = new Date(
        parseInt(m[3], 10),
        MONTHS[m[1].toLowerCase().slice(0, 3)] != null
          ? MONTHS[m[1].toLowerCase().slice(0, 3)]
          : MONTHS[m[1].toLowerCase()],
        parseInt(m[2], 10)
      );
      if (!isNaN(d.getTime())) {
        return {
          kind: 'date',
          date: d,
          label: d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        };
      }
    }
    return { kind: 'unknown', date: null, label: s };
  }

  function daysUntil(date) {
    var now = new Date();
    var a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.round((b - a) / 86400000);
  }

  // ── Deadline reminders (shown on the tracker; local only) ─────
  var reminders = {
    list: function () {
      var arr = read(LS.reminders, []);
      return Array.isArray(arr) ? arr : [];
    },
    save: function (arr) {
      return write(LS.reminders, arr);
    },
    add: function (oppId, dateISO, note) {
      var arr = this.list();
      arr.push({
        id: 'r' + Date.now().toString(36),
        oppId: oppId,
        date: dateISO,
        note: String(note || ''),
        done: false,
        createdAt: new Date().toISOString(),
      });
      this.save(arr);
    },
    toggle: function (id) {
      var arr = this.list();
      arr.forEach(function (r) {
        if (r.id === id) r.done = !r.done;
      });
      this.save(arr);
    },
    remove: function (id) {
      this.save(
        this.list().filter(function (r) {
          return r.id !== id;
        })
      );
    },
  };

  // ── Document gatherer: recommended supporting docs per category ─
  // These are the documents funders of each type most commonly require.
  // Always verify against the funder's official checklist before filing.
  var DOCS_BY_CATEGORY = {
    'state-grant': [
      ['business-plan', 'Business plan or project narrative'],
      ['use-of-funds', 'Itemized use-of-funds budget'],
      ['financials', 'Last 2 years of business financial statements'],
      ['tax-returns', 'Business tax returns (2 years)'],
      ['jobs-plan', 'Job creation / retention projections'],
      ['licenses', 'Business license and registrations'],
    ],
    'federal-grant': [
      ['sam-gov', 'SAM.gov registration (UEI)'],
      ['business-plan', 'Project narrative / technical proposal'],
      ['use-of-funds', 'Detailed project budget (SF-424A style)'],
      ['financials', 'Audited financial statements'],
      ['tax-returns', 'Business tax returns (3 years)'],
      ['resumes', 'Key personnel resumes'],
    ],
    'tax-incentive': [
      ['jobs-plan', 'Hiring plan with wages by position'],
      ['financials', 'Current financial statements'],
      ['tax-returns', 'Business tax returns (2 years)'],
      ['site-plan', 'Expansion / relocation site details'],
    ],
    'workforce-training': [
      ['training-plan', 'Training plan with curriculum and provider'],
      ['use-of-funds', 'Training cost breakdown'],
      ['employees-list', 'List of employees to be trained'],
    ],
    loan: [
      ['business-plan', 'Business plan'],
      ['financials', 'Business financial statements (2–3 years)'],
      ['tax-returns', 'Business + personal tax returns (3 years)'],
      ['pfs', 'Personal financial statement'],
      ['collateral', 'Collateral documentation'],
      ['use-of-funds', 'Use-of-proceeds statement'],
    ],
    microloan: [
      ['business-plan', 'Business plan (may be brief)'],
      ['use-of-funds', 'Use-of-funds breakdown'],
      ['tax-returns', 'Tax returns (1–2 years)'],
      ['id', 'Government photo ID'],
    ],
    'pitch-competition': [
      ['pitch-deck', 'Pitch deck (10–15 slides)'],
      ['exec-summary', 'One-page executive summary'],
      ['financials', 'Financial projections (3 years)'],
    ],
    'foundation-grant': [
      ['business-plan', 'Project narrative'],
      ['use-of-funds', 'Project budget'],
      ['financials', 'Organizational financial statements'],
      ['tax-returns', 'Tax returns or Form 990 (nonprofits)'],
      ['mission', 'Mission statement and impact description'],
    ],
  };
  var DOCS_DEFAULT = [
    ['business-plan', 'Business plan or project narrative'],
    ['use-of-funds', 'Itemized use-of-funds budget'],
    ['financials', 'Business financial statements'],
    ['tax-returns', 'Business tax returns'],
    ['id', 'Government photo ID'],
  ];

  function docListFor(entry) {
    if (entry && DOCS_BY_CATEGORY[entry.category]) return DOCS_BY_CATEGORY[entry.category];
    return DOCS_DEFAULT;
  }

  var docs = {
    key: function (oppId) {
      return LS.docsPrefix + oppId;
    },
    list: function (entry) {
      return docListFor(entry);
    },
    checked: function (oppId) {
      var v = read(this.key(oppId), {});
      return v && typeof v === 'object' ? v : {};
    },
    set: function (oppId, docKey, on) {
      var v = this.checked(oppId);
      if (on) v[docKey] = true;
      else delete v[docKey];
      write(this.key(oppId), v);
    },
    progress: function (oppId, entry) {
      var total = this.list(entry).length;
      if (!total) return { done: 0, total: 0 };
      var v = this.checked(oppId);
      var done = 0;
      this.list(entry).forEach(function (d) {
        if (v[d[0]]) done++;
      });
      return { done: done, total: total };
    },
  };

  // ── Eligibility matcher ───────────────────────────────────────
  // answers: { structure, revenue, employees, tags: [] }
  // structures: llc, scorp, ccorp, soleprop, nonprofit, coop, prerevenue
  // revenue: under100k, 100k-1m, 1m-5m, over5m
  // employees: zero, 1-10, 11-50, 51plus
  // tags: veteran, women, rural, manufacturing, exporting, hiring
  function scoreEntry(entry, answers) {
    var score = 50;
    var reasons = [];
    var hay = (
      entry.name +
      ' ' +
      entry.org +
      ' ' +
      entry.eligibility +
      ' ' +
      entry.notes +
      ' ' +
      entry.amount
    ).toLowerCase();
    var has = function () {
      for (var i = 0; i < arguments.length; i++) {
        if (hay.indexOf(arguments[i]) !== -1) return true;
      }
      return false;
    };

    if (answers.structure === 'nonprofit' && entry.category === 'foundation-grant') {
      score += 25;
      reasons.push('Prioritizes nonprofits and mission-driven orgs');
    }
    if (answers.structure === 'prerevenue') {
      if (entry.category === 'pitch-competition' || entry.category === 'microloan') {
        score += 20;
        reasons.push('Built for early-stage and pre-revenue businesses');
      }
      if (entry.category === 'loan') {
        score -= 15;
        reasons.push('Traditional loans usually want operating history');
      }
    }
    if (
      (answers.employees === '51plus' ||
        answers.revenue === 'over5m' ||
        answers.revenue === '1m-5m') &&
      entry.category === 'tax-incentive'
    ) {
      score += 20;
      reasons.push('Tax incentives reward larger job-creation commitments');
    }
    if (answers.employees === 'zero' && has('job', 'hiring', 'new full-time')) {
      score -= 10;
      reasons.push('Tied to job creation — needs hiring plans');
    }
    if (
      answers.tags.indexOf('hiring') !== -1 &&
      has('job creation', 'new jobs', 'workforce', 'hiring')
    ) {
      score += 15;
      reasons.push('Matches your hiring plans');
    }
    if (answers.tags.indexOf('rural') !== -1 && has('rural')) {
      score += 15;
      reasons.push('Explicitly serves rural businesses');
    }
    if (answers.tags.indexOf('veteran') !== -1 && has('veteran')) {
      score += 20;
      reasons.push('Veteran-owned businesses called out');
    }
    if (answers.tags.indexOf('women') !== -1 && has('women', 'woman')) {
      score += 20;
      reasons.push('Women-owned businesses called out');
    }
    if (answers.tags.indexOf('manufacturing') !== -1 && has('manufacturing', 'manufacturer')) {
      score += 12;
      reasons.push('Manufacturing focus');
    }
    if (answers.tags.indexOf('exporting') !== -1 && has('export')) {
      score += 15;
      reasons.push('Supports exporters');
    }
    if (entry.status === 'closed') {
      score -= 25;
      reasons.push('Latest round closed — watch for the next cycle');
    }
    if (/rolling/i.test(entry.deadline)) {
      score += 5;
      reasons.push('Rolling deadline — apply anytime');
    }
    score = Math.max(5, Math.min(99, score));
    return { score: score, reasons: reasons.slice(0, 3) };
  }

  function rankAll(answers) {
    return entries()
      .map(function (e) {
        var s = scoreEntry(e, answers);
        return { entry: e, score: s.score, reasons: s.reasons };
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });
  }

  var quiz = {
    get: function () {
      return read(LS.quiz, null);
    },
    save: function (answers) {
      return write(LS.quiz, answers);
    },
    // Prefill quiz answers from the business profile vault when present.
    prefillFromProfile: function () {
      var p = profile.get();
      var a = {};
      if (p.business_type) {
        var t = p.business_type.toLowerCase();
        if (/non.?profit/.test(t)) a.structure = 'nonprofit';
        else if (/s-?corp/.test(t)) a.structure = 'scorp';
        else if (/c-?corp/.test(t)) a.structure = 'ccorp';
        else if (/sole/.test(t)) a.structure = 'soleprop';
        else if (/coop/.test(t)) a.structure = 'coop';
        else a.structure = 'llc';
      }
      if (p.employees) {
        var n = parseInt(String(p.employees).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(n))
          a.employees = n === 0 ? 'zero' : n <= 10 ? '1-10' : n <= 50 ? '11-50' : '51plus';
      }
      if (p.annual_revenue) {
        var r = p.annual_revenue.toLowerCase().replace(/[^0-9kmb.]/g, '');
        var k =
          r.indexOf('k') !== -1
            ? parseFloat(r)
            : r.indexOf('m') !== -1
              ? parseFloat(r) * 1000
              : parseFloat(r);
        if (!isNaN(k))
          a.revenue = k < 100 ? 'under100k' : k < 1000 ? '100k-1m' : k < 5000 ? '1m-5m' : 'over5m';
      }
      return a;
    },
  };

  window.GrantVault = {
    esc: esc,
    entries: entries,
    findOpportunity: findOpportunity,
    profile: profile,
    pipeline: pipeline,
    reminders: reminders,
    docs: docs,
    parseDeadline: parseDeadline,
    daysUntil: daysUntil,
    quiz: quiz,
    rankAll: rankAll,
    scoreEntry: scoreEntry,
  };
})();

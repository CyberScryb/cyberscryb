// ai-lemon-law-demand-letter: flagship life tool boot
// Mode intake (demand letter / final repair opportunity / follow-up),
// structured vehicle + repair-log intake (vehicle, attempts, dates, days out
// of service, dealer/manufacturer facts), state-lemon-law branching (state
// select feeds the prompt; client-side panel compares the user's numbers to
// the common 4-attempt / 30-day presumption), client-side deadline math
// (warranty end, days since purchase, follow-up + escalation from the mailed
// date, all from user dates only), printable demand letter with a repair log
// and certified-mail/follow-up log artifact, and on-device saved drafts.
(function () {
  'use strict';

  var TOOL_ID = 'ai-lemon-law-demand-letter';
  var HISTORY_KEY = 'cs_lld_drafts_' + TOOL_ID;
  var HISTORY_CAP = 10;
  var FOLLOW_UP_DAYS = 21;
  var ESCALATE_DAYS = 45;
  var PRESUMPTION_ATTEMPTS = 4;
  var PRESUMPTION_DAYS_OUT = 30;

  var MODE_LABELS = {
    'demand-letter': 'Demand repurchase or replacement',
    'final-repair-opportunity': 'Final repair opportunity notice',
    'follow-up': 'Follow-up demand after no answer',
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Date math (deterministic, client-side, user dates only) ──
  function parseDateInput(value) {
    if (!value) return null;
    var parts = value.split('-');
    if (parts.length !== 3) return null;
    var d = new Date(parts[0] * 1, parts[1] * 1 - 1, parts[2] * 1);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(d) {
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function numVal(id) {
    var el = $(id);
    if (!el) return null;
    var n = parseInt(String(el.value).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? null : n;
  }

  function updateClaimPanel() {
    var panel = $('claim-panel');
    var countEl = $('claim-count');
    if (!panel || !countEl) return;
    var attempts = numVal('repair_attempts');
    var daysOut = numVal('days_out');
    var purchase = parseDateInput(($('purchase_date') || {}).value || '');
    var firstRepair = parseDateInput(($('first_repair_date') || {}).value || '');
    var mailed = parseDateInput(($('mailed_date') || {}).value || '');
    var warrantyMonths = numVal('warranty_months');
    panel.classList.remove('deadline-urgent', 'deadline-safe');
    var html = '';
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    if (attempts != null) {
      var met = attempts >= PRESUMPTION_ATTEMPTS;
      html +=
        '<div><strong>' +
        attempts +
        ' repair attempt' +
        (attempts === 1 ? '' : 's') +
        '</strong> for this defect. Common presumption: ' +
        PRESUMPTION_ATTEMPTS +
        ' attempts. ' +
        (met
          ? 'Your count meets the common presumption.'
          : 'Below the common presumption; the days-out number may still matter.') +
        '</div>';
    }
    if (daysOut != null) {
      var metDays = daysOut >= PRESUMPTION_DAYS_OUT;
      html +=
        '<div style="margin-top:0.25rem"><strong>' +
        daysOut +
        ' day' +
        (daysOut === 1 ? '' : 's') +
        '</strong> out of service. Common presumption: ' +
        PRESUMPTION_DAYS_OUT +
        ' days. ' +
        (metDays ? 'Your total meets the common presumption.' : 'Below the common presumption.') +
        '</div>';
    }
    if (purchase) {
      var daysOwned = Math.round((today.getTime() - purchase.getTime()) / 86400000);
      html +=
        '<div style="margin-top:0.25rem">Owned <strong>' +
        daysOwned +
        ' day' +
        (daysOwned === 1 ? '' : 's') +
        '</strong> since ' +
        esc(fmtDate(purchase)) +
        '.</div>';
      if (warrantyMonths != null) {
        var end = new Date(purchase.getTime());
        end.setMonth(end.getMonth() + warrantyMonths);
        html +=
          '<div style="margin-top:0.25rem">A ' +
          warrantyMonths +
          '-month warranty from purchase ends around <strong>' +
          esc(fmtDate(end)) +
          '</strong>' +
          (today.getTime() > end.getTime() ? ' (passed).' : ' (still open).') +
          '</div>';
      }
    }
    if (firstRepair) {
      var daysSince = Math.round((today.getTime() - firstRepair.getTime()) / 86400000);
      html +=
        '<div style="margin-top:0.25rem"><strong>' +
        daysSince +
        ' day' +
        (daysSince === 1 ? '' : 's') +
        '</strong> since the first repair (' +
        esc(fmtDate(firstRepair)) +
        ').</div>';
    }
    if (mailed) {
      var followUp = new Date(mailed.getTime());
      followUp.setDate(followUp.getDate() + FOLLOW_UP_DAYS);
      var escalate = new Date(mailed.getTime());
      escalate.setDate(escalate.getDate() + ESCALATE_DAYS);
      html +=
        '<div style="margin-top:0.5rem">Letter mailed ' +
        esc(fmtDate(mailed)) +
        '.</div>' +
        '<div style="margin-top:0.25rem">Follow up if no answer by <strong>' +
        esc(fmtDate(followUp)) +
        '</strong> (day ' +
        FOLLOW_UP_DAYS +
        ').</div>' +
        '<div style="margin-top:0.25rem">If still nothing by <strong>' +
        esc(fmtDate(escalate)) +
        '</strong> (day ' +
        ESCALATE_DAYS +
        '), talk to a lemon law attorney in your state before accepting any offer.</div>';
      if (today.getTime() >= followUp.getTime()) {
        panel.classList.add('deadline-urgent');
        html +=
          '<div style="margin-top:0.5rem; color:#f87171; font-weight:700">Follow-up is due: the ' +
          FOLLOW_UP_DAYS +
          '-day window has passed.</div>';
      } else {
        panel.classList.add('deadline-safe');
      }
    }
    countEl.innerHTML =
      html ||
      '<small>Enter your repair attempts, days out of service, and dates to see your numbers next to the common lemon law presumption.</small>';
  }

  // ── Saved drafts (localStorage, survives follow-up rounds) ──
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveDraft(letterText) {
    var entry = {
      at: new Date().toISOString().slice(0, 10),
      mode: MODE_LABELS[($('mode-value') || {}).value] || '',
      vehicle: (($('vehicle') || {}).value || '').trim(),
      letter: letterText.slice(0, 6000),
    };
    var arr = loadHistory();
    arr.unshift(entry);
    if (arr.length > HISTORY_CAP) arr = arr.slice(0, HISTORY_CAP);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    } catch (e) {}
    renderHistory();
  }

  function renderHistory() {
    var list = $('draft-list');
    if (!list) return;
    var arr = loadHistory();
    if (!arr.length) {
      list.innerHTML =
        '<li style="font-size: 0.8rem; color: var(--text-faint)">No drafts yet.</li>';
      return;
    }
    list.innerHTML = '';
    arr.forEach(function (entry) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size: 0.82rem; margin-bottom: 0.6rem;';
      var title = document.createElement('button');
      title.type = 'button';
      title.className = 'lt-ghost';
      title.style.cssText =
        'font-size: 0.82rem; text-align: left; padding: 0.4rem 0.6rem; width: 100%;';
      title.textContent =
        entry.at + ' · ' + entry.mode + (entry.vehicle ? ' · ' + entry.vehicle : '');
      title.addEventListener('click', function () {
        restoreDraft(entry);
      });
      li.appendChild(title);
      list.appendChild(li);
    });
  }

  function restoreDraft(entry) {
    var out = $('output-text');
    if (!out) return;
    out.innerHTML = '';
    var pre = document.createElement('div');
    pre.style.whiteSpace = 'pre-wrap';
    pre.textContent = entry.letter;
    out.appendChild(pre);
    renderLetter(out.innerHTML);
    if (window.LifeTool) LifeTool.toast('Draft reloaded from ' + entry.at);
  }

  // ── Printable letter + repair log / mail log artifact ───────
  var latestLetterHtml = '';

  function buildFactRows() {
    var modeEl = $('mode-value');
    var rows = [
      ['Letter type', MODE_LABELS[modeEl ? modeEl.value : ''] || ''],
      ['State', (($('state') || {}).value || '').trim()],
      ['Vehicle', (($('vehicle') || {}).value || '').trim()],
      ['VIN (last 6)', (($('vin') || {}).value || '').trim()],
      ['Purchase date', ($('purchase_date') || {}).value || ''],
      ['Purchase price', (($('purchase_price') || {}).value || '').trim()],
      ['Warranty length', (($('warranty_months') || {}).value || '').trim()],
      ['Defect', (($('defect') || {}).value || '').trim()],
      ['Dealer', (($('dealer') || {}).value || '').trim()],
      ['Manufacturer', (($('manufacturer') || {}).value || '').trim()],
      ['Repair attempts', (($('repair_attempts') || {}).value || '').trim()],
      ['Days out of service', (($('days_out') || {}).value || '').trim()],
      ['First repair date', ($('first_repair_date') || {}).value || ''],
      ['Most recent repair date', ($('last_repair_date') || {}).value || ''],
      ['Mileage at first repair', (($('mileage_first') || {}).value || '').trim()],
      ['Current mileage', (($('mileage_now') || {}).value || '').trim()],
      ['Date mailed', ($('mailed_date') || {}).value || ''],
    ];
    return rows
      .filter(function (r) {
        return r[1];
      })
      .map(function (r) {
        return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
      })
      .join('');
  }

  function renderLetter(letterHtml) {
    if (letterHtml != null) latestLetterHtml = letterHtml;
    var wrap = $('lemon-letter-wrap');
    var box = $('lemon-letter');
    if (!wrap || !box) return;
    var rows = buildFactRows();
    var letter = latestLetterHtml || '';
    var log = (($('repair_log') || {}).value || '').trim();
    if (!rows && !letter && !log) {
      wrap.style.display = 'none';
      return;
    }
    var logHtml = log
      ? '<h3>Repair log</h3><div class="report-guidance">' + esc(log) + '</div>'
      : '<p style="color: var(--text-muted);">No repair log entered yet.</p>';
    var html =
      '<h3>Lemon law demand letter</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb Lemon Law Demand Letter tool. Educational only, not legal advice. Confirm your state\'s thresholds and deadlines, talk to a lemon law attorney in your state before you send the letter or accept an offer, sign the letter, keep a copy, and mail it certified with return receipt requested.</p>' +
      '<table><tbody>' +
      rows +
      '</tbody></table>' +
      (letter
        ? '<h3>Letter</h3><div class="report-guidance">' + letter + '</div>'
        : '<p style="color: var(--text-muted);">No letter generated yet.</p>') +
      logHtml +
      '<h3>Certified-mail and follow-up log</h3>' +
      '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem;">' +
      "<li>Mail certified with return receipt requested to the manufacturer at the address in your warranty booklet or owner's manual. Log the tracking number, the date mailed, and the name and address you sent it to.</li>" +
      '<li>Attach copies of every dated repair order, in order. Keep the originals.</li>' +
      '<li>Log the response: date received, who answered, and exactly what they offered. Do not sign or accept anything without advice from a lemon law attorney in your state.</li>' +
      '<li>No answer after ' +
      FOLLOW_UP_DAYS +
      ' days: send round two. State the first mailing date, keep the same firm tone, and name the follow-up date.</li>' +
      '<li>No answer after ' +
      ESCALATE_DAYS +
      ' days: talk to a lemon law attorney in your state before accepting any offer or filing anything.</li>' +
      '<li>Never state facts that are not true, and never promise what you cannot keep.</li>' +
      '</ul>';
    box.innerHTML = html;
    wrap.style.display = 'block';
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.LifeTool) {
      console.error('LifeTool missing');
      return;
    }

    LifeTool.mount({
      toolId: TOOL_ID,
      emptyMessage:
        'Add the vehicle, the state, the defect, and the repair log so the letter is about your car, not a generic template.',
      fieldIds: [
        'state',
        'vehicle',
        'vin',
        'purchase_date',
        'purchase_price',
        'warranty_months',
        'defect',
        'dealer',
        'manufacturer',
        'repair_attempts',
        'days_out',
        'first_repair_date',
        'last_repair_date',
        'mileage_first',
        'mileage_now',
        'mailed_date',
        'repair_log',
      ],
      modeLabels: MODE_LABELS,
      modeTips: {
        'demand-letter': {
          title: 'Demand repurchase or replacement',
          body: 'A formal claim to the manufacturer: the defect, the repair history, the days out of service, and one specific demand, repurchase, replacement, or refund, with a date to respond by. Use this once the repair attempts and days out of service are on the record.',
        },
        'final-repair-opportunity': {
          title: 'Final repair opportunity notice',
          body: 'Many states require the manufacturer to get one last chance to fix the defect after written notice. This mode drafts that notice instead of a full demand: the defect, the repair history so far, and a written request for a final repair within the time your state allows. Do not skip this step if your state requires it.',
        },
        'follow-up': {
          title: 'Follow-up after no answer',
          body: 'A second-round demand after silence. It references the first mailing date, restates the demand in one sentence, and sets a new deadline. Use it after about 21 days with no answer, and escalate to a lemon law attorney in your state if there is still nothing after about 45 days.',
        },
      },
      criticalFields: [
        'state',
        'vehicle',
        'purchase_date',
        'defect',
        'repair_attempts',
        'days_out',
        'repair_log',
      ],
    });

    // Claim-at-a-glance panel: client-side math from the user's dates only.
    [
      'repair_attempts',
      'days_out',
      'purchase_date',
      'first_repair_date',
      'warranty_months',
      'mailed_date',
    ].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', updateClaimPanel);
        el.addEventListener('input', updateClaimPanel);
      }
    });
    updateClaimPanel();

    // Build printable letter button.
    var buildBtn = $('build-letter-btn');
    if (buildBtn)
      buildBtn.addEventListener('click', function () {
        renderLetter();
        if (window.LifeTool) LifeTool.toast('Printable letter and logs ready below');
      });

    // Save every generated letter to on-device draft history.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      if (!out) return;
      latestLetterHtml = out.innerHTML;
      var text = out.innerText || out.textContent || '';
      if (text && !out.querySelector('.placeholder')) {
        saveDraft(text);
        renderLetter(out.innerHTML);
      }
    });

    var clearHist = $('clear-history-btn');
    if (clearHist)
      clearHist.addEventListener('click', function () {
        if (!confirm('Delete all saved drafts on this device?')) return;
        try {
          localStorage.removeItem(HISTORY_KEY);
        } catch (e) {}
        renderHistory();
        if (window.LifeTool) LifeTool.toast('History cleared');
      });

    renderHistory();
  });
})();

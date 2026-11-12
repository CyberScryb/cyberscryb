// ai-snap-benefits-appeal-letter: flagship life tool boot
// Mode intake (fair hearing request / aid pending / follow-up),
// structured SNAP notice + household intake (denial reason, household size,
// income, benefits, notice date), client-side deadline math (90-day fair
// hearing window and 10-day aid-pending window from the notice date only,
// follow-up + escalation from the mailed date), printable appeal letter with
// a household-facts table and certified-mail/follow-up log artifact, and
// on-device saved drafts. Never invents facts, never predicts outcomes,
// never asserts state law: the notice is the authority on deadlines.
(function () {
  'use strict';

  var TOOL_ID = 'ai-snap-benefits-appeal-letter';
  var HISTORY_KEY = 'cs_snap_drafts_' + TOOL_ID;
  var HISTORY_CAP = 10;
  var FAIR_HEARING_DAYS = 90;
  var AID_PENDING_DAYS = 10;
  var FOLLOW_UP_DAYS = 21;
  var ESCALATE_DAYS = 45;

  var MODE_LABELS = {
    'fair-hearing-request': 'Fair hearing request',
    'aid-pending-request': 'Fair hearing request with aid pending',
    'follow-up': 'Follow-up after no answer',
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

  function updateDeadlinePanel() {
    var panel = $('claim-panel');
    var countEl = $('claim-count');
    if (!panel || !countEl) return;
    var notice = parseDateInput(($('notice_date') || {}).value || '');
    var mailed = parseDateInput(($('mailed_date') || {}).value || '');
    var household = numVal('household_size');
    panel.classList.remove('deadline-urgent', 'deadline-safe');
    var html = '';
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    if (household != null) {
      html +=
        '<div>Household of <strong>' +
        household +
        '</strong>. The letter states the household size and income exactly as you enter them.</div>';
    }
    if (notice) {
      var hearingDeadline = new Date(notice.getTime());
      hearingDeadline.setDate(hearingDeadline.getDate() + FAIR_HEARING_DAYS);
      var aidDeadline = new Date(notice.getTime());
      aidDeadline.setDate(aidDeadline.getDate() + AID_PENDING_DAYS);
      var daysLeft = Math.round((hearingDeadline.getTime() - today.getTime()) / 86400000);
      var aidLeft = Math.round((aidDeadline.getTime() - today.getTime()) / 86400000);
      html +=
        '<div style="margin-top:0.5rem">Notice dated <strong>' +
        esc(fmtDate(notice)) +
        '</strong>.</div>' +
        '<div style="margin-top:0.25rem">Fair hearing request due by <strong>' +
        esc(fmtDate(hearingDeadline)) +
        '</strong> (day ' +
        FAIR_HEARING_DAYS +
        '): ' +
        (daysLeft >= 0
          ? '<strong>' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left</strong>.'
          : '<strong>that date has passed</strong>; ask the agency or a legal aid organization in your state right away.') +
        '</div>' +
        '<div style="margin-top:0.25rem">To keep benefits going while you wait, usually ask within <strong>' +
        esc(fmtDate(aidDeadline)) +
        '</strong> (day ' +
        AID_PENDING_DAYS +
        '): ' +
        (aidLeft >= 0
          ? '<strong>' + aidLeft + ' day' + (aidLeft === 1 ? '' : 's') + ' left</strong>.'
          : '<strong>that window has passed</strong>; the fair hearing request itself is still the step to take.') +
        '</div>' +
        '<div style="margin-top:0.25rem; font-size:0.8rem; color:var(--text-muted)">Your notice states the exact deadline. This panel only does the math from the date you entered.</div>';
      if (daysLeft < 0 || aidLeft < 0) panel.classList.add('deadline-urgent');
      else panel.classList.add('deadline-safe');
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
        '), contact a legal aid organization in your state before accepting any offer.</div>';
      if (today.getTime() >= followUp.getTime()) {
        panel.classList.add('deadline-urgent');
        html +=
          '<div style="margin-top:0.5rem; color:#f87171; font-weight:700">Follow-up is due: the ' +
          FOLLOW_UP_DAYS +
          '-day window has passed.</div>';
      } else if (!notice) {
        panel.classList.add('deadline-safe');
      }
    }
    countEl.innerHTML =
      html ||
      '<small>Enter the date on your notice to see your 90-day fair hearing deadline and the 10-day window to keep benefits going while you wait.</small>';
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
      decision: (($('denial_reason') || {}).value || '').trim(),
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
        entry.at + ' · ' + entry.mode + (entry.decision ? ' · ' + entry.decision : '');
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

  // ── Printable letter + household facts / mail log artifact ───
  var latestLetterHtml = '';

  function buildFactRows() {
    var modeEl = $('mode-value');
    var rows = [
      ['Letter type', MODE_LABELS[modeEl ? modeEl.value : ''] || ''],
      ['State', (($('state') || {}).value || '').trim()],
      ['Agency decision', (($('denial_reason') || {}).value || '').trim()],
      ['Notice date', ($('notice_date') || {}).value || ''],
      ['Case number', (($('case_number') || {}).value || '').trim()],
      ['Household size', (($('household_size') || {}).value || '').trim()],
      ['Monthly household income', (($('monthly_income') || {}).value || '').trim()],
      ['Current monthly SNAP benefit', (($('current_benefit') || {}).value || '').trim()],
      ['Agency', (($('agency') || {}).value || '').trim()],
      ['County', (($('county') || {}).value || '').trim()],
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
    var wrap = $('snap-letter-wrap');
    var box = $('snap-letter');
    if (!wrap || !box) return;
    var rows = buildFactRows();
    var letter = latestLetterHtml || '';
    var reason = (($('agency_reason') || {}).value || '').trim();
    var evidence = (($('evidence') || {}).value || '').trim();
    if (!rows && !letter && !reason && !evidence) {
      wrap.style.display = 'none';
      return;
    }
    var reasonHtml = reason
      ? '<h3>Reason the agency gave</h3><div class="report-guidance">' + esc(reason) + '</div>'
      : '';
    var evidenceHtml = evidence
      ? '<h3>Evidence enclosed</h3><div class="report-guidance">' + esc(evidence) + '</div>'
      : '<p style="color: var(--text-muted);">No evidence list entered yet.</p>';
    var html =
      '<h3>SNAP benefits appeal letter</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb SNAP Benefits Appeal Letter tool. Educational only, not legal advice. Your notice states the exact deadline and where to send the request; confirm both on the notice, talk to a legal aid organization in your state before you send the letter, sign the letter, keep a copy, and mail it certified with return receipt requested.</p>' +
      '<table><tbody>' +
      rows +
      '</tbody></table>' +
      (letter
        ? '<h3>Letter</h3><div class="report-guidance">' + letter + '</div>'
        : '<p style="color: var(--text-muted);">No letter generated yet.</p>') +
      reasonHtml +
      evidenceHtml +
      '<h3>Certified-mail and follow-up log</h3>' +
      '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem;">' +
      '<li>Mail certified with return receipt requested to the address on your notice. Log the tracking number, the date mailed, and the name and address you sent it to.</li>' +
      '<li>Attach copies of your evidence and a copy of the notice, in order. Keep the originals.</li>' +
      '<li>Log the response: date received, who answered, and exactly what they said. Do not sign or accept anything without advice from a legal aid organization in your state.</li>' +
      '<li>No answer after ' +
      FOLLOW_UP_DAYS +
      ' days: send round two. State the first mailing date, keep the same firm tone, and name the follow-up date.</li>' +
      '<li>No answer after ' +
      ESCALATE_DAYS +
      ' days: contact a legal aid organization in your state before accepting any offer or reapplying.</li>' +
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
        'Add the state, the agency decision, the notice date, and the household facts so the letter is about your case, not a generic template.',
      fieldIds: [
        'state',
        'denial_reason',
        'notice_date',
        'case_number',
        'household_size',
        'monthly_income',
        'current_benefit',
        'agency',
        'county',
        'mailed_date',
        'agency_reason',
        'evidence',
      ],
      modeLabels: MODE_LABELS,
      modeTips: {
        'fair-hearing-request': {
          title: 'Fair hearing request',
          body: 'A formal request for a fair hearing before an impartial hearing officer: the notice, the decision you disagree with, the facts that support your side, and the evidence you are enclosing. Use this within the 90-day window on your notice.',
        },
        'aid-pending-request': {
          title: 'Fair hearing + keep benefits going',
          body: 'A fair hearing request that also asks for benefits to continue while the appeal is pending. This only applies when benefits are being reduced or ended, and it usually has to be requested within the advance notice period, generally 10 days after the notice was mailed. If the appeal is lost, the agency may ask for the continued benefits back.',
        },
        'follow-up': {
          title: 'Follow-up after no answer',
          body: 'A second-round letter after silence. It references the first mailing date, restates the request for a fair hearing in one sentence, and sets a new deadline. Use it after about 21 days with no answer, and contact a legal aid organization in your state if there is still nothing after about 45 days.',
        },
      },
      criticalFields: ['state', 'denial_reason', 'notice_date', 'household_size', 'agency_reason'],
    });

    // Deadline-at-a-glance panel: client-side math from the user's dates only.
    ['notice_date', 'household_size', 'mailed_date'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', updateDeadlinePanel);
        el.addEventListener('input', updateDeadlinePanel);
      }
    });
    updateDeadlinePanel();

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

// CyberScryb AI Rental Application Letter Writer — uses shared CSAITool core
(function () {
  'use strict';

  const DRAFT_KEY = 'rental-letter-draft';
  const FIELD_IDS = [
    'rent-name',
    'rent-contact',
    'rent-property',
    'rent-monthly',
    'rent-job',
    'rent-employer',
    'rent-income',
    'rent-tenure',
    'rent-landlord',
    'rent-moving',
    'rent-history',
    'rent-references',
    'rent-pets',
    'rent-pets-details',
    'rent-length',
  ];

  const $ = id => document.getElementById(id);
  const val = id => {
    const el = $(id);
    return el ? el.value.trim() : '';
  };

  document.addEventListener('DOMContentLoaded', () => {
    // ── Draft memory: restore saved intake on load ──────────────────
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      FIELD_IDS.forEach(id => {
        const el = $(id);
        if (el && typeof saved[id] === 'string') el.value = saved[id];
      });
      const toneEl = document.querySelector(
        'input[name="rent-tone"][value="' +
          (saved['rent-tone'] || 'Confident and professional') +
          '"]'
      );
      if (toneEl) toneEl.checked = true;
      updatePetDetails();
      $('rent-history').style.height = 'auto';
      $('rent-history').style.height = $('rent-history').scrollHeight + 'px';
    } catch (e) {
      /* storage unavailable */
    }

    // ── Draft memory: auto-save on input ────────────────────────────
    const saveDraft = () => {
      try {
        const draft = {};
        FIELD_IDS.forEach(id => {
          const el = $(id);
          if (el) draft[id] = el.value;
        });
        const tone = document.querySelector('input[name="rent-tone"]:checked');
        draft['rent-tone'] = tone ? tone.value : 'Confident and professional';
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        /* storage unavailable */
      }
    };
    document
      .querySelectorAll('.input-panel input, .input-panel select, .input-panel textarea')
      .forEach(el => {
        el.addEventListener('input', saveDraft);
        el.addEventListener('change', saveDraft);
      });

    // ── Pets select toggles details field ───────────────────────────
    $('rent-pets').addEventListener('change', () => {
      updatePetDetails();
      saveDraft();
    });

    // ── Textarea auto-resize ────────────────────────────────────────
    $('rent-history').addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });

    // ── Sample button ───────────────────────────────────────────────
    $('sample-btn').addEventListener('click', () => {
      const sample = {
        'rent-name': 'Dana Whitfield',
        'rent-contact': 'dana.whitfield@email.com · (555) 123-4567',
        'rent-property': '414 Oak Avenue, Unit B, Sandpoint, ID 83864',
        'rent-monthly': '$1,450',
        'rent-job': 'Dental hygienist',
        'rent-employer': 'Northside Dental Group',
        'rent-income': '$5,200',
        'rent-tenure': '4 years',
        'rent-landlord': 'Rented from Cedar Property Group for 3 years',
        'rent-moving': 'Relocating closer to work and need a second bedroom for family visits',
        'rent-history':
          'Three years as a tenant with zero late payments. Unit left in excellent condition at last move-out. No evictions, no lease violations. Previous landlord available as a reference and describes me as reliable and quiet.',
        'rent-references':
          'Maria L., previous landlord, (555) 987-6543; employer reference available on request',
        'rent-pets': 'yes',
        'rent-pets-details':
          'One spayed 6-year-old lab mix, 45 lbs, house-trained, no damage or bite history',
        'rent-length': 'Standard letter, about 250 words',
      };
      Object.keys(sample).forEach(id => {
        const el = $(id);
        if (el) el.value = sample[id];
      });
      const tone = document.querySelector(
        'input[name="rent-tone"][value="Confident and professional"]'
      );
      if (tone) tone.checked = true;
      updatePetDetails();
      $('rent-history').style.height = 'auto';
      $('rent-history').style.height = $('rent-history').scrollHeight + 'px';
      saveDraft();
      $('rent-name').focus();
    });

    // ── Core wiring ─────────────────────────────────────────────────
    window.CSAITool.init({
      toolId: 'rental-application-letter-writer',
      emptyMessage:
        'Please add your name plus at least some employment or rental-history detail so the letter has substance.',
      collectInput: () => {
        const name = val('rent-name');
        const employment = [
          val('rent-job'),
          val('rent-employer'),
          val('rent-income'),
          val('rent-tenure'),
        ]
          .filter(Boolean)
          .join(' | ');
        const history = val('rent-history');
        if (!name || (!employment && !history)) return '';
        const lines = [];
        lines.push('Applicant name: ' + name);
        if (val('rent-contact')) lines.push('Contact: ' + val('rent-contact'));
        if (val('rent-property')) lines.push('Applying for property: ' + val('rent-property'));
        if (val('rent-monthly')) lines.push('Monthly rent: ' + val('rent-monthly'));
        if (employment) lines.push('Employment: ' + employment);
        if (val('rent-landlord')) lines.push('Current tenancy: ' + val('rent-landlord'));
        if (val('rent-moving')) lines.push('Reason for moving: ' + val('rent-moving'));
        if (history) lines.push('Rental history highlights: ' + history);
        if (val('rent-references')) lines.push('References: ' + val('rent-references'));
        if (val('rent-pets') === 'yes') {
          lines.push(
            'Pets: yes' + (val('rent-pets-details') ? ' (' + val('rent-pets-details') + ')' : '')
          );
        } else {
          lines.push('Pets: none');
        }
        return lines.join('\n');
      },
      collectParams: () => {
        const toneEl = document.querySelector('input[name="rent-tone"]:checked');
        return {
          tone: toneEl ? toneEl.value : 'Confident and professional',
          length: val('rent-length') || 'Standard letter, about 250 words',
          applicant: val('rent-name'),
        };
      },
      onStats: text => {
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        const el = $('word-count');
        if (el) el.textContent = words + ' words';
      },
    });

    // ── Word (.doc) export button ───────────────────────────────────
    $('word-btn').addEventListener('click', () => {
      const out = $('output-text');
      if (!out || out.innerText.trim() === '' || out.querySelector('.placeholder')) {
        alert('Generate a letter first, then download.');
        return;
      }
      if (window.FormalExport && window.FormalExport.exportWordDoc) {
        window.FormalExport.exportWordDoc(
          out.innerText,
          'rental-application-letter',
          'Rental Application Cover Letter'
        );
      }
    });

    // ── Print / PDF button ──────────────────────────────────────────
    $('print-btn').addEventListener('click', () => {
      if (typeof window.printLetter === 'function') window.printLetter();
      else {
        const out = $('output-text');
        if (!out || out.innerText.trim() === '' || out.querySelector('.placeholder')) {
          alert('Generate a letter first, then print.');
          return;
        }
        window.print();
      }
    });

    // ── Share button is auto-added by the shared core ───────────────
  });

  function updatePetDetails() {
    const pets = $('rent-pets');
    const details = $('rent-pets-details');
    if (!pets || !details) return;
    if (pets.value === 'yes') details.classList.remove('hidden');
    else details.classList.add('hidden');
  }
})();

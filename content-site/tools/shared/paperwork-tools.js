/* Plain-text paperwork tools. Input stays in this page; nothing is saved or sent. */
(function () {
  'use strict';

  const clean = value => String(value == null ? '' : value).trim();
  const eventTypes = {
    purchase: 'Purchase or payment',
    contact: 'Contact with customer service',
    response: 'Reply received',
    promise: 'Promise or agreed next step',
    evidence: 'Record saved',
    other: 'Other event',
  };

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function formatDate(value) {
    if (!validDate(value)) throw new Error('Use a real calendar date.');
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(value + 'T12:00:00Z'));
  }

  function refundErrors(data) {
    const errors = {};
    if (!clean(data.company)) errors.company = 'Add the company or seller you are contacting.';
    if (!clean(data.item)) errors.item = 'Add the item or service you paid for.';
    if (!clean(data.issue)) errors.issue = 'Describe what went wrong.';
    for (const key of ['purchaseDate', 'replyDate']) {
      if (clean(data[key]) && !validDate(data[key])) errors[key] = 'Use a real calendar date.';
    }
    if (!['refund', 'replacement', 'repair'].includes(data.remedy)) {
      errors.remedy = 'Choose a refund, replacement, or repair.';
    }
    return errors;
  }

  function buildRefund(data) {
    if (Object.keys(refundErrors(data)).length) {
      throw new Error('Add the missing details before creating your draft.');
    }
    const d = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, clean(value)]));
    const request = { refund: 'a refund', replacement: 'a replacement', repair: 'a repair' }[
      d.remedy
    ];
    const paragraphs = [
      `Subject: ${d.remedy[0].toUpperCase() + d.remedy.slice(1)} request — ${d.item}`,
      `Hello ${d.company} team,`,
      `I am writing to request ${request} for ${d.item}${d.purchaseDate ? ', purchased on ' + formatDate(d.purchaseDate) : ''}.`,
    ];
    const facts = [];
    if (d.reference) facts.push(`Order or reference: ${d.reference}`);
    if (d.amount) facts.push(`Amount paid: ${d.amount}`);
    if (facts.length) paragraphs.push(facts.join('\n'));
    paragraphs.push(d.issue);
    if (d.prior) paragraphs.push(`Previous contact:\n${d.prior}`);
    if (d.evidence) paragraphs.push(`Records available:\n${d.evidence}`);
    paragraphs.push(
      `Please let me know how to arrange ${request} and whether you need any further details from me.`
    );
    if (d.replyDate) {
      paragraphs.push(`I would appreciate a reply by ${formatDate(d.replyDate)}.`);
    }
    paragraphs.push('Thank you.' + (d.name ? '\n' + d.name : ''));
    return paragraphs.join('\n\n');
  }

  function eventErrors(event) {
    const errors = {};
    if (!validDate(clean(event.date))) errors.date = 'Add the date this happened.';
    if (!Object.hasOwn(eventTypes, event.type)) errors.type = 'Choose an event type.';
    if (!clean(event.details)) errors.details = 'Add what happened, in your own words.';
    return errors;
  }

  function orderedEvents(events) {
    return events
      .map((event, index) => ({ ...event, index }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);
  }

  function buildTimeline(data, events) {
    if (!events.length) return '';
    if (events.some(event => Object.keys(eventErrors(event)).length)) {
      throw new Error('Each event needs a valid date, event type, and description.');
    }
    if (clean(data.followupDate) && !validDate(data.followupDate)) {
      throw new Error('Use a real date for your personal follow-up reminder.');
    }
    const parts = [clean(data.title) || 'Customer service timeline'];
    if (clean(data.reference)) parts.push(`Case or order reference: ${clean(data.reference)}`);
    parts.push(
      orderedEvents(events)
        .map(event => {
          const lines = [`${formatDate(event.date)} — ${eventTypes[event.type]}`];
          if (clean(event.channel)) lines.push(`Channel: ${clean(event.channel)}`);
          if (clean(event.contact)) lines.push(`Contact: ${clean(event.contact)}`);
          lines.push(clean(event.details));
          if (clean(event.evidence)) lines.push(`Record reference: ${clean(event.evidence)}`);
          return lines.join('\n');
        })
        .join('\n\n')
    );
    if (clean(data.questions)) parts.push(`Open questions:\n${clean(data.questions)}`);
    if (clean(data.nextAction)) parts.push(`My next step:\n${clean(data.nextAction)}`);
    if (clean(data.followupDate)) {
      parts.push(
        `My follow-up reminder: ${formatDate(data.followupDate)} (personal reminder, not a legal deadline; no notification is scheduled).`
      );
    }
    return parts.join('\n\n');
  }

  function initialise(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true';
    const kind = root.dataset.paperworkTool;
    const form = root.querySelector('form');
    const output = root.querySelector('#pw-output');
    const status = root.querySelector('#pw-status');
    const get = key => root.querySelector('[name="' + key + '"]');
    const read = keys => Object.fromEntries(keys.map(key => [key, get(key).value]));
    const announce = text => {
      status.textContent = text;
    };
    const hasOutput = () => Boolean(output.value.trim());
    const exportButtons = [...root.querySelectorAll('[data-export]')];
    function refreshExports() {
      exportButtons.forEach(button => {
        button.disabled = !hasOutput();
      });
      root.querySelector('#pw-output-empty').hidden = hasOutput();
    }
    function errorsFor(errors) {
      root.querySelectorAll('[data-error-for]').forEach(node => {
        const key = node.dataset.errorFor;
        node.textContent = errors[key] || '';
        get(key).setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
      });
      const first = Object.keys(errors)[0];
      if (first) {
        announce('Check the highlighted fields, then try again.');
        const disclosure = get(first).closest('details');
        if (disclosure) disclosure.open = true;
        get(first).focus();
      }
      return Boolean(first);
    }
    function download() {
      const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = kind === 'refund' ? 'refund-request.txt' : 'paper-trail.txt';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      announce('Your text file is ready. Check your browser’s downloads.');
    }
    const printArea = document.getElementById('pw-print');
    function preparePrint() {
      if (!hasOutput()) return;
      printArea.textContent = output.value;
      printArea.hidden = false;
      document.body.classList.add('pw-printing');
    }
    function finishPrint() {
      printArea.hidden = true;
      document.body.classList.remove('pw-printing');
    }
    window.addEventListener('beforeprint', preparePrint);
    window.addEventListener('afterprint', finishPrint);
    exportButtons.forEach(button => {
      button.addEventListener('click', async () => {
        if (!hasOutput()) return;
        if (kind === 'timeline' && eventKeys.some(key => key !== 'type' && clean(get(key).value))) {
          announce('Add or save the event you are editing before exporting your timeline.');
          get('date').focus();
          return;
        }
        if (button.dataset.export === 'copy') {
          try {
            await navigator.clipboard.writeText(output.value);
            announce('Copied. Paste it into your email, document, or notes.');
          } catch {
            output.focus();
            output.select();
            announce(
              'Automatic copy is unavailable. Your text is selected; use your device’s Copy command.'
            );
          }
        } else if (button.dataset.export === 'download') {
          download();
        } else {
          preparePrint();
          window.print();
          finishPrint();
        }
      });
    });
    output.addEventListener('input', refreshExports);

    const refundKeys = [
      'company',
      'item',
      'purchaseDate',
      'amount',
      'reference',
      'issue',
      'prior',
      'evidence',
      'remedy',
      'replyDate',
      'name',
    ];
    const eventKeys = ['date', 'type', 'channel', 'contact', 'details', 'evidence'];
    const caseKeys = ['title', 'reference', 'questions', 'nextAction', 'followupDate'];
    let events = [];
    let editIndex = -1;
    let generated = '';
    const list = root.querySelector('#pw-events');
    function updateTimeline() {
      if (kind !== 'timeline') return;
      const data = read(caseKeys);
      const invalidFollowup = clean(data.followupDate) && !validDate(data.followupDate);
      get('followupDate').setAttribute('aria-invalid', invalidFollowup ? 'true' : 'false');
      root.querySelector('[data-error-for="followupDate"]').textContent = invalidFollowup
        ? 'Use a real calendar date.'
        : '';
      output.value = invalidFollowup ? '' : buildTimeline(data, events);
      refreshExports();
      root.querySelector('#pw-event-count').textContent =
        `${events.length} ${events.length === 1 ? 'event' : 'events'}`;
      root.querySelector('#pw-events-empty').hidden = Boolean(events.length);
      list.replaceChildren();
      orderedEvents(events).forEach((event, position) => {
        const li = document.createElement('li');
        li.className = 'pw-event';
        const heading = document.createElement('h3');
        heading.textContent = formatDate(event.date) + ' · ' + eventTypes[event.type];
        const text = document.createElement('p');
        text.textContent = event.details;
        const actions = document.createElement('div');
        actions.className = 'pw-actions';
        for (const action of ['Edit', 'Remove']) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'pw-text-button';
          button.textContent = action;
          button.setAttribute(
            'aria-label',
            `${action} event ${position + 1}: ${formatDate(event.date)}`
          );
          button.addEventListener('click', () => {
            if (action === 'Edit') {
              if (
                eventKeys.some(key => key !== 'type' && clean(get(key).value)) &&
                !window.confirm(
                  'Replace the event currently in the form? Unsaved changes will be lost.'
                )
              )
                return;
              editIndex = event.index;
              eventKeys.forEach(key => {
                get(key).value = event[key] || '';
              });
              root.querySelector('#pw-add-event').textContent = 'Save event';
              root.querySelector('#pw-cancel-edit').hidden = false;
              errorsFor({});
              get('date').focus();
              announce('Editing event. Save your changes to update the timeline.');
            } else {
              if (!window.confirm('Remove this event from the timeline?')) return;
              events.splice(event.index, 1);
              if (editIndex === event.index) resetEvent();
              else if (editIndex > event.index) editIndex -= 1;
              updateTimeline();
              const next = list.querySelector('button');
              (next || get('date')).focus();
              announce('Event removed. The summary has been updated.');
            }
          });
          actions.append(button);
        }
        li.append(heading, text, actions);
        list.append(li);
      });
    }
    function resetEvent() {
      eventKeys.forEach(key => {
        get(key).value = key === 'type' ? 'contact' : '';
      });
      editIndex = -1;
      root.querySelector('#pw-add-event').textContent = 'Add event';
      root.querySelector('#pw-cancel-edit').hidden = true;
      errorsFor({});
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (kind === 'refund') {
        const data = read(refundKeys);
        if (errorsFor(refundErrors(data))) return;
        if (
          hasOutput() &&
          output.value !== generated &&
          !window.confirm('Replace your edited draft with a new one using the form details?')
        )
          return;
        generated = buildRefund(data);
        output.value = generated;
        refreshExports();
        announce('Draft ready. Check the facts and edit the wording before you send it.');
        output.focus();
      } else {
        const data = read(eventKeys);
        if (errorsFor(eventErrors(data))) return;
        const editing = editIndex >= 0;
        if (editing) events[editIndex] = data;
        else events.push(data);
        resetEvent();
        updateTimeline();
        get('date').focus();
        announce(
          editing
            ? 'Event updated. Your summary is ready.'
            : 'Event added. Add another, or export your summary.'
        );
      }
    });
    root.querySelector('#pw-clear').addEventListener('click', () => {
      const dirty =
        hasOutput() ||
        [...root.querySelectorAll('input, textarea')].some(field => clean(field.value));
      if (
        dirty &&
        !window.confirm(
          'Clear all details and the result? Download a copy first if you need to keep it.'
        )
      )
        return;
      form.reset();
      if (kind === 'timeline') {
        caseKeys.forEach(key => {
          get(key).value = '';
        });
        events = [];
        resetEvent();
        updateTimeline();
      }
      generated = '';
      output.value = '';
      errorsFor({});
      refreshExports();
      announce('Cleared. Nothing from this tool has been saved by CyberScryb.');
      get(kind === 'refund' ? 'company' : 'title').focus();
    });
    root.querySelector('#pw-example').addEventListener('click', () => {
      const dirty =
        hasOutput() ||
        [...root.querySelectorAll('input, textarea')].some(field => clean(field.value));
      if (dirty && !window.confirm('Replace the current details with a fictional example?')) return;
      errorsFor({});
      if (kind === 'refund') {
        const example = {
          company: 'Example Home Store',
          item: 'a desk lamp',
          purchaseDate: '2026-09-12',
          amount: '$38.00',
          reference: 'EXAMPLE-1042',
          issue: 'The lamp arrived on September 15 with a cracked base. I have not used it.',
          prior: 'I emailed customer service on September 16 and received case number EX-27.',
          evidence: 'Order confirmation and two photos of the damaged base.',
          remedy: 'refund',
          replyDate: '',
          name: '',
        };
        refundKeys.forEach(key => {
          get(key).value = example[key];
        });
        generated = buildRefund(example);
        output.value = generated;
        refreshExports();
        output.focus();
      } else {
        resetEvent();
        const example = {
          title: 'Damaged desk lamp — Example Home Store',
          reference: 'EXAMPLE-1042',
          questions: 'Do I need to return the lamp? If so, who provides the return label?',
          nextAction: 'Check for a reply, then follow up using case EX-27 if needed.',
          followupDate: '2026-09-23',
        };
        caseKeys.forEach(key => {
          get(key).value = example[key];
        });
        events = [
          {
            date: '2026-09-15',
            type: 'evidence',
            channel: '',
            contact: '',
            details: 'Lamp arrived with a cracked base. Took two photos before repacking it.',
            evidence: 'Photos: lamp-base-1.jpg and lamp-base-2.jpg in my order folder.',
          },
          {
            date: '2026-09-12',
            type: 'purchase',
            channel: 'Website',
            contact: 'Example Home Store',
            details: 'Ordered a desk lamp for $38.00.',
            evidence: 'Order confirmation EXAMPLE-1042.',
          },
          {
            date: '2026-09-16',
            type: 'contact',
            channel: 'Email',
            contact: 'Customer service',
            details:
              'Asked for a refund and return instructions. Automatic reply gave case number EX-27.',
            evidence: 'Email thread: Damaged desk lamp.',
          },
        ];
        updateTimeline();
        get('title').focus();
      }
      announce('Fictional example loaded. Replace every detail with your own before using it.');
    });
    if (kind === 'timeline') {
      caseKeys.forEach(key =>
        get(key).addEventListener('input', () => {
          updateTimeline();
        })
      );
      root.querySelector('#pw-cancel-edit').addEventListener('click', () => {
        resetEvent();
        get('date').focus();
        announce('Edit cancelled. The saved event is unchanged.');
      });
      updateTimeline();
    }
    refreshExports();
  }

  window.PaperworkTools = {
    validDate,
    formatDate,
    refundErrors,
    buildRefund,
    eventErrors,
    orderedEvents,
    buildTimeline,
    initialise,
  };
  function ready() {
    document.querySelectorAll('[data-paperwork-tool]').forEach(initialise);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

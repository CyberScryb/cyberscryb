/* Is This Link Safe — browser UI.
   The pasted address is analyzed in memory and never uploaded, stored, or fetched. */
(function () {
  var logic = window.LSLogic;
  if (!logic || !document.getElementById('ls-url')) return;

  var input = document.getElementById('ls-url');
  var check = document.getElementById('ls-check');
  var result = document.getElementById('ls-result');
  var live = document.getElementById('ls-live');
  var copyStatus = document.getElementById('ls-copy-status');
  var lastText = '';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function announce(text) {
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function showEmpty() {
    result.className = 'ls-result ls-result-empty';
    clearNode(result);
    result.appendChild(
      el(
        'p',
        null,
        'Paste a link, or try one of the tricky examples. The check stays in this browser.'
      )
    );
  }

  function pillLabel(severity) {
    if (severity === 'danger') return 'Danger';
    if (severity === 'caution') return 'Caution';
    return 'Note';
  }

  function render(analysis) {
    clearNode(result);
    result.className = 'ls-result';
    if (!analysis.ok) {
      result.classList.add('ls-result-error');
      var alert = el('p', 'ls-error', analysis.error);
      alert.setAttribute('role', 'alert');
      result.appendChild(alert);
      lastText = analysis.error;
      announce(analysis.error);
      return;
    }

    result.classList.add('ls-result-' + analysis.verdict);
    var heading = el('h2', 'ls-verdict');
    heading.id = 'ls-verdict-heading';
    heading.tabIndex = -1;
    heading.appendChild(el('span', 'ls-verdict-badge', analysis.verdictLabel));
    heading.appendChild(el('span', 'ls-verdict-summary', analysis.summary));
    result.appendChild(heading);

    var read = el('div', 'ls-reading');
    read.appendChild(el('h3', null, 'How this address is read'));
    var bits = el('p', 'ls-bits');
    analysis.reading.parts.forEach(function (part) {
      bits.appendChild(el('span', 'ls-bit ls-bit-' + part.role, part.text));
    });
    read.appendChild(bits);
    var site =
      analysis.reading.registrableDomain || analysis.reading.host || analysis.reading.scheme;
    var callout = el('p', 'ls-real');
    callout.appendChild(el('span', 'ls-real-label', 'You would open'));
    callout.appendChild(el('strong', null, site));
    read.appendChild(callout);
    read.appendChild(el('p', 'ls-explain', analysis.reading.explanation));
    result.appendChild(read);

    var findingsWrap = el('div', 'ls-findings');
    findingsWrap.appendChild(
      el('h3', null, analysis.findings.length ? 'What stood out' : 'Nothing stood out')
    );
    if (!analysis.findings.length) {
      findingsWrap.appendChild(
        el(
          'p',
          'ls-quiet',
          'None of the checks on this page fired. That still is not a promise the page is safe.'
        )
      );
    } else {
      var list = document.createElement('ol');
      list.className = 'ls-finding-list';
      analysis.findings.forEach(function (item) {
        var li = el('li', 'ls-finding ls-finding-' + item.severity);
        var head = el('div', 'ls-finding-head');
        head.appendChild(el('span', 'ls-pill', pillLabel(item.severity)));
        head.appendChild(el('h4', null, item.title));
        li.appendChild(head);
        li.appendChild(el('p', null, item.detail));
        list.appendChild(li);
      });
      findingsWrap.appendChild(list);
    }
    result.appendChild(findingsWrap);

    var actions = el('div', 'ls-actions');
    var copy = el('button', null, 'Copy this reading');
    copy.type = 'button';
    copy.addEventListener('click', copyReading);
    var clear = el('button', null, 'Clear');
    clear.type = 'button';
    clear.addEventListener('click', function () {
      input.value = '';
      lastText = '';
      if (copyStatus) copyStatus.textContent = '';
      showEmpty();
      input.focus();
    });
    actions.appendChild(copy);
    actions.appendChild(clear);
    result.appendChild(actions);

    lastText = logic.summaryText(analysis);
    var notable = analysis.findings.filter(function (item) {
      return item.severity !== 'info';
    }).length;
    var spoken = analysis.verdictLabel + '. ' + analysis.summary;
    if (notable) spoken += ' ' + notable + (notable === 1 ? ' finding.' : ' findings.');
    announce(spoken);
    heading.focus();
  }

  function run() {
    if (copyStatus) copyStatus.textContent = '';
    render(logic.analyze(input.value));
  }

  function copyReading() {
    if (!lastText) return;
    var done = function () {
      if (copyStatus) copyStatus.textContent = 'Copied the reading.';
    };
    var failed = function () {
      if (copyStatus)
        copyStatus.textContent = 'Copy failed. Select the reading and copy it yourself.';
    };
    var fallback = function () {
      var area = document.createElement('textarea');
      area.value = lastText;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      try {
        if (document.execCommand('copy')) done();
        else failed();
      } catch {
        failed();
      }
      document.body.removeChild(area);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastText).then(done).catch(fallback);
    } else {
      fallback();
    }
  }

  function renderExamples() {
    var root = document.getElementById('ls-examples');
    if (!root) return;
    logic.EXAMPLES.forEach(function (example) {
      var button = el('button', 'ls-example ls-example-' + example.verdict);
      button.type = 'button';
      button.appendChild(el('span', 'ls-example-kicker', example.label));
      button.appendChild(el('span', 'ls-example-blurb', example.blurb));
      button.appendChild(el('span', 'ls-example-url', example.url));
      button.addEventListener('click', function () {
        input.value = example.url;
        run();
      });
      root.appendChild(button);
    });
  }

  check.addEventListener('click', run);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });
  renderExamples();
})();

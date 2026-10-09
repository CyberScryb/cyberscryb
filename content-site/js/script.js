// Keyboard and touch navigation use the same open state.
document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.querySelector('.hamburger');
  const menu = document.querySelector('.nav-menu');
  if (toggle && menu) {
    if (!menu.id) menu.id = 'cs-nav-menu';
    toggle.setAttribute('aria-controls', menu.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    function setOpen(open) {
      menu.classList.toggle('open', open);
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    toggle.addEventListener('click', () =>
      setOpen(toggle.getAttribute('aria-expanded') !== 'true')
    );
    menu
      .querySelectorAll('a')
      .forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', event => {
      if (!menu.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });
  }
  const main = document.querySelector('main');
  if (main && !document.querySelector('.cs-skip-link')) {
    if (!main.id) main.id = 'cs-main';
    const skip = document.createElement('a');
    skip.className = 'cs-skip-link';
    skip.href = '#' + main.id;
    skip.textContent = 'Skip to content';
    document.body.prepend(skip);
    main.tabIndex = -1;
  }
  if (!window.CSSupport && !document.querySelector('script[src*="/tools/shared/support.js"]')) {
    const script = document.createElement('script');
    script.src = '/tools/shared/support.js?v=20261005';
    document.body.appendChild(script);
  }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const href = this.getAttribute('href');
    if (href === '#') return;
    const target = document.getElementById(href.slice(1));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });
});

// Contact form handling
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    const requiredFields = this.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        isValid = false;
        field.style.borderColor = '#ff4444';
      } else {
        field.style.borderColor = '';
      }
    });

    if (!isValid) {
      e.preventDefault();
      alert('Please fill in all required fields.');
      return;
    }

    // Add loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    // Reset after a delay (form will actually submit)
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }, 2000);
  });
}

// Scroll to top functionality
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}

// Add scroll-to-top button if needed
window.addEventListener('scroll', function () {
  const scrollBtn = document.querySelector('.scroll-to-top');
  if (scrollBtn) {
    if (window.pageYOffset > 300) {
      scrollBtn.style.display = 'block';
    } else {
      scrollBtn.style.display = 'none';
    }
  }
});

// Lazy loading for images
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

// Analytics and tracking
function trackEvent(eventName, eventData) {
  if (window.CSConsent?.getState() === 'accepted' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventData);
  }
}

// Track affiliate link clicks
document
  .querySelectorAll('a[href*="affiliate"], a[href*="ref="], a[href*="?utm_"]')
  .forEach(link => {
    link.addEventListener('click', function () {
      trackEvent('affiliate_click', {
        url: this.href,
        text: this.textContent.trim(),
      });
    });
  });

// ─── Live page interactions (hover / pointer feel) ─────────────────
// "Hover" = pointer is over something, before click. These effects
// react to movement so the UI feels alive without requiring a click.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Skip coarse pointers (most phones) — hover isn't the model there
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    // Soft ambient glow that follows the cursor (very low opacity)
    var glow = document.createElement('div');
    glow.className = 'cs-cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    var gx = 0,
      gy = 0,
      tx = 0,
      ty = 0,
      raf = 0;
    function tick() {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';
      raf = requestAnimationFrame(tick);
    }
    window.addEventListener(
      'pointermove',
      function (e) {
        tx = e.clientX;
        ty = e.clientY;
        if (!raf) raf = requestAnimationFrame(tick);
        glow.classList.add('is-on');
      },
      { passive: true }
    );
    window.addEventListener('pointerleave', function () {
      glow.classList.remove('is-on');
    });

    // Cards: spotlight follows pointer inside the card
    var cards = document.querySelectorAll(
      '.blog-card, .glass-card, .tool-card, .hz-price-card, .pro-band-inner, .hz-workspace'
    );
    cards.forEach(function (card) {
      card.classList.add('cs-interactive');
      card.addEventListener(
        'pointermove',
        function (e) {
          var r = card.getBoundingClientRect();
          var x = ((e.clientX - r.left) / r.width) * 100;
          var y = ((e.clientY - r.top) / r.height) * 100;
          card.style.setProperty('--spot-x', x + '%');
          card.style.setProperty('--spot-y', y + '%');
        },
        { passive: true }
      );
      card.addEventListener('pointerenter', function () {
        card.classList.add('is-hot');
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-hot');
      });
    });

    // Buttons / CTAs: slight magnetic pull toward cursor
    var magnets = document.querySelectorAll(
      '.cta-button, .cta-attention, .cta-secondary, .btn-primary, .btn-attention, .hz-primary-btn, .lt-gen'
    );
    magnets.forEach(function (el) {
      el.classList.add('cs-magnetic');
      el.addEventListener(
        'pointermove',
        function (e) {
          var r = el.getBoundingClientRect();
          var dx = e.clientX - (r.left + r.width / 2);
          var dy = e.clientY - (r.top + r.height / 2);
          el.style.transform =
            'translate(' + dx * 0.12 + 'px,' + dy * 0.18 + 'px) translateY(-1px)';
        },
        { passive: true }
      );
      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
      });
    });

    // Nav links: mark for CSS underline grow
    document.querySelectorAll('.nav-menu a').forEach(function (a) {
      a.classList.add('cs-nav-link');
    });
  });
})();

// ─── Automatic Draft Persistence (User Retention) ───
(function () {
  if (typeof window === 'undefined' || !window.localStorage) return;

  var path = window.location.pathname;
  if (!path.includes('/tools/')) return;

  var storageKey = 'cs_draft_' + path.replace(/\/+$/, '');

  function findInput() {
    return (
      document.getElementById('robotic-text') ||
      document.getElementById('tool-input') ||
      document.getElementById('input-text') ||
      document.getElementById('job-description') ||
      document.querySelector('.hz-editor:not(.hz-output)') ||
      document.querySelector('textarea.tool-input') ||
      document.querySelector('textarea')
    );
  }

  function initDraft() {
    var input = findInput();
    if (!input) return;

    // Restore draft if present and input is empty
    try {
      var saved = localStorage.getItem(storageKey);
      if (saved && !input.value.trim()) {
        input.value = saved;
        input.dispatchEvent(new Event('input', { bubbles: true }));

        var banner = document.createElement('div');
        banner.className = 'cs-draft-notice';
        banner.style.cssText =
          'font-size:0.8rem; color:#854d0e; background:#fef9c3; border:1px solid #fef08a; padding:6px 12px; border-radius:6px; margin:8px 0; display:flex; justify-content:space-between; align-items:center;';
        banner.innerHTML =
          '<span>Draft restored from your last visit</span><button type="button" style="background:none;border:none;color:#a16207;cursor:pointer;font-size:0.8rem;text-decoration:underline;" aria-label="Clear restored draft">Clear</button>';

        banner.querySelector('button').addEventListener('click', function () {
          localStorage.removeItem(storageKey);
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          banner.remove();
        });

        if (input.parentNode) {
          input.parentNode.insertBefore(banner, input);
        }
      }
    } catch (e) {}

    // Debounced autosave
    var saveTimeout = null;
    input.addEventListener('input', function () {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(function () {
        try {
          var val = input.value.trim();
          if (val) {
            localStorage.setItem(storageKey, val);
          } else {
            localStorage.removeItem(storageKey);
          }
        } catch (e) {}
      }, 500);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDraft);
  } else {
    initDraft();
  }
})();

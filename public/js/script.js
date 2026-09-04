// CyberScryb Website JavaScript with Mixpanel Tracking & Compliance

// 1. Dynamic Mixpanel Loader Snippet
(function (f, b) {
  if (!b.__SV) {
    var a, e, i, g;
    window.mixpanel = b;
    b._i = [];
    b.init = function (a, e, d) {
      function f(b, h) {
        var a = h.split('.');
        2 == a.length && ((b = b[a[0]]), (h = a[1]));
        b[h] = function () {
          b.push([h].concat(Array.prototype.slice.call(arguments, 0)));
        };
      }
      var c = b;
      'undefined' !== typeof d ? (c = b[d] = []) : (d = 'mixpanel');
      c.people = c.people || [];
      c.toString = function (b) {
        var a = 'mixpanel';
        'mixpanel' !== d && (a += '.' + d);
        b || (a += ' (stub)');
        return a;
      };
      c.people.toString = function () {
        return c.toString(1) + '.people (stub)';
      };
      i =
        'disable_time_track track track_pageview track_links track_forms track_with_groups register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove'.split(
          ' '
        );
      for (g = 0; g < i.length; g++) f(c, i[g]);
      b._i.push([a, e, d]);
    };
    b.__SV = 1.2;
    a = f.createElement('script');
    a.type = 'text/javascript';
    a.async = !0;
    a.src =
      'undefined' !== typeof MIXPANEL_CUSTOM_LIB_URL
        ? MIXPANEL_CUSTOM_LIB_URL
        : 'file:' === f.location.protocol &&
            '//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'.match(/^\/\//)
          ? 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'
          : '//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
    e = f.getElementsByTagName('script')[0];
    e.parentNode.insertBefore(a, e);
  }
})(document, window.mixpanel || []);

// 2. Bot & Developer Heuristic Detectors
function detectBot() {
  const ua = navigator.userAgent || '';
  const botPattern =
    /bot|googlebot|crawler|spider|robot|crawling|lighthouse|headless|semrush|ahrefs|bingbot|yandex|baidu|pingdom|cyber/i;
  const isBotUA = botPattern.test(ua);
  const isWebdriver = !!navigator.webdriver;
  const isHeadlessChrome = /HeadlessChrome/.test(ua);
  const hasAutomationProperties = !!(
    window.domAutomation ||
    window._phantom ||
    window.__nightmare ||
    window.navigator.webdriver
  );
  const noLanguages = !navigator.languages || navigator.languages.length === 0;

  return !!(isBotUA || isWebdriver || isHeadlessChrome || hasAutomationProperties || noLanguages);
}

function detectDeveloper() {
  const hostname = window.location.hostname || '';
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.endsWith('.local');
  const hasDevParam =
    new URLSearchParams(window.location.search).has('dev_mode') ||
    new URLSearchParams(window.location.search).has('dev');
  const hasDevCookie =
    document.cookie.includes('cs_developer=1') || document.cookie.includes('cs_dev=1');
  const hasDevStorage =
    localStorage.getItem('cs_developer') === '1' || localStorage.getItem('cs_dev') === 'true';

  return !!(isLocal || hasDevParam || hasDevCookie || hasDevStorage);
}

// 3. Initialize Mixpanel with GDPR/CCPA Opt-Out Default
mixpanel.init('10d2f010eeaf3943b19d54c49771c6ac', {
  opt_out_tracking_by_default: true,
  track_pageview: true,
  persistence: 'localStorage',
});

// 4. Register Super Properties (Filters for Bot / Developer / Real User)
const isBot = detectBot();
const isDev = detectDeveloper();
const visitorType = isDev ? 'developer' : isBot ? 'bot' : 'real_user';

mixpanel.register({
  is_bot: isBot,
  is_developer: isDev,
  visitor_type: visitorType,
});

// 5. Handle Consent & Display Glassmorphic Banner
const consentState = localStorage.getItem('cs_cookie_consent');
if (consentState === 'accepted') {
  mixpanel.opt_in_tracking();
} else if (consentState === 'declined') {
  mixpanel.opt_out_tracking();
  window['ga-disable-G-LS46B9J1XK'] = true;
} else {
  // If consent hasn't been given/declined, display banner on load
  if (document.readyState === 'complete') {
    showCookieConsentBanner();
  } else {
    window.addEventListener('load', showCookieConsentBanner);
  }
}

function showCookieConsentBanner() {
  if (document.getElementById('cs-cookie-banner')) return;

  // Premium CSS style injection
  const style = document.createElement('style');
  style.textContent = `
        .cs-cookie-banner {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            width: calc(100% - 48px);
            max-width: 540px;
            background: rgba(255, 252, 247, 0.97);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(44, 24, 16, 0.14);
            border-radius: 12px;
            padding: 20px 24px;
            box-shadow: 0 10px 40px rgba(44, 24, 16, 0.16);
            z-index: 99999;
            font-family: 'Outfit', system-ui, sans-serif;
            color: #3D2B1F;
            display: flex;
            flex-direction: column;
            gap: 14px;
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s;
            opacity: 0;
        }
        .cs-cookie-banner.cs-show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        .cs-cookie-header {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .cs-cookie-title {
            font-family: inherit;
            font-size: 1rem;
            font-weight: 700;
            color: #2C1810;
            letter-spacing: 0.5px;
        }
        .cs-cookie-text {
            font-size: 0.8rem;
            line-height: 1.5;
            color: #3D2B1F;
            margin: 0;
        }
        .cs-cookie-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
        }
        .cs-cookie-btn {
            font-family: inherit;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .cs-cookie-btn-accept {
            background: #C2410C;
            color: #FFFCF7;
            border: none;
            box-shadow: 0 4px 14px rgba(194, 65, 12, 0.25);
        }
        .cs-cookie-btn-accept:hover {
            transform: translateY(-1px);
            background: #9A3412;
            box-shadow: 0 6px 18px rgba(194, 65, 12, 0.35);
        }
        .cs-cookie-btn-decline {
            background: transparent;
            color: #3D2B1F;
            border: 1px solid rgba(44, 24, 16, 0.25);
        }
        .cs-cookie-btn-decline:hover {
            color: #2C1810;
            border-color: rgba(44, 24, 16, 0.45);
            background: rgba(44, 24, 16, 0.04);
        }
        @media(max-width: 480px) {
            .cs-cookie-banner {
                bottom: 16px;
                width: calc(100% - 32px);
                padding: 16px;
            }
        }
    `;
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.id = 'cs-cookie-banner';
  banner.className = 'cs-cookie-banner';
  banner.innerHTML = `
        <div class="cs-cookie-header">
            <span style="font-size:1.2rem;">🛡️</span>
            <div class="cs-cookie-title">Privacy Preference</div>
        </div>
        <p class="cs-cookie-text">
            We use anonymized cookies to measure visits and analyze tool performance. Since you are visiting from the EU or California, we ask for your consent to enable these analytics.
        </p>
        <div class="cs-cookie-actions">
            <button class="cs-cookie-btn cs-cookie-btn-decline" id="cs-cookie-decline">Decline</button>
            <button class="cs-cookie-btn cs-cookie-btn-accept" id="cs-cookie-accept">Accept</button>
        </div>
    `;

  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('cs-show'), 100);

  document.getElementById('cs-cookie-accept').addEventListener('click', () => {
    localStorage.setItem('cs_cookie_consent', 'accepted');
    mixpanel.opt_in_tracking();
    banner.classList.remove('cs-show');
    setTimeout(() => banner.remove(), 400);
  });

  document.getElementById('cs-cookie-decline').addEventListener('click', () => {
    localStorage.setItem('cs_cookie_consent', 'declined');
    mixpanel.opt_out_tracking();
    window['ga-disable-G-LS46B9J1XK'] = true;
    banner.classList.remove('cs-show');
    setTimeout(() => banner.remove(), 400);
  });
}

// 6. Hook gtag to duplicate events to Mixpanel
(function () {
  var originalGtag = window.gtag;
  window.gtag = function () {
    if (typeof originalGtag === 'function') {
      originalGtag.apply(this, arguments);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(arguments);
    }

    if (arguments[0] === 'event') {
      var eventName = arguments[1];
      var eventParams = arguments[2] || {};
      trackEvent(eventName, eventParams);
    }
  };
})();

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking on a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });
});

// Newsletter form handling
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const input = this.querySelector('input[type="email"]');
    const email = input ? input.value.trim() : '';
    if (!email) {
      return;
    }

    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Subscribing...';
    submitBtn.disabled = true;

    let msgEl = this.parentNode.querySelector('.cs-newsletter-msg');
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.className = 'cs-newsletter-msg';
      msgEl.style.marginTop = '0.75rem';
      msgEl.style.fontSize = '0.9rem';
      msgEl.style.textAlign = 'center';
      this.parentNode.appendChild(msgEl);
    }

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage' }),
      });
      const data = await res.json();
      if (res.ok) {
        input.value = '';
        submitBtn.textContent = 'Subscribed!';
        msgEl.style.color = '#15803d';
        msgEl.textContent = 'You are on the list! Thank you for subscribing.';
      } else {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        msgEl.style.color = '#b91c1c';
        msgEl.textContent = data.error || 'Something went wrong. Please try again.';
      }
    } catch (err) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      msgEl.style.color = '#b91c1c';
      msgEl.textContent = 'Network error. Please try again.';
    }
  });
}

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
  if (window.mixpanel && typeof window.mixpanel.track === 'function') {
    window.mixpanel.track(eventName, eventData);
  }
  if (detectDeveloper()) {
    console.log('[Mixpanel Event]:', eventName, eventData);
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
          '<span>Draft restored from your last visit</span><button type="button" style="background:none;border:none;color:#a16207;cursor:pointer;font-size:0.8rem;text-decoration:underline;">Clear</button>';

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

// CyberScryb Website JavaScript with Mixpanel Tracking & Compliance

// 1. Dynamic Mixpanel Loader Snippet
(function(f,b){if(!b.__SV){var a,e,i,g;window.mixpanel=b;b._i=[];b.init=function(a,e,d){function f(b,h){var a=h.split(".");2==a.length&&(b=b[a[0]],h=a[1]);b[h]=function(){b.push([h].concat(Array.prototype.slice.call(arguments,0)))}}var c=b;"undefined"!==typeof d?c=b[d]=[]:d="mixpanel";c.people=c.people||[];c.toString=function(b){var a="mixpanel";"mixpanel"!==d&&(a+="."+d);b||(a+=" (stub)");return a};c.people.toString=function(){return c.toString(1)+".people (stub)"};i="disable_time_track track track_pageview track_links track_forms track_with_groups register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");
for(g=0;g<i.length;g++)f(c,i[g]);b._i.push([a,e,d])};b.__SV=1.2;a=f.createElement("script");a.type="text/javascript";a.async=!0;a.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?MIXPANEL_CUSTOM_LIB_URL:"file:"===f.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";e=f.getElementsByTagName("script")[0];e.parentNode.insertBefore(a,e)}})(document,window.mixpanel||[]);

// 2. Bot & Developer Heuristic Detectors
function detectBot() {
    const ua = navigator.userAgent || '';
    const botPattern = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|headless|semrush|ahrefs|bingbot|yandex|baidu|pingdom|cyber/i;
    const isBotUA = botPattern.test(ua);
    const isWebdriver = !!navigator.webdriver;
    const isHeadlessChrome = /HeadlessChrome/.test(ua);
    const hasAutomationProperties = !!(window.domAutomation || window._phantom || window.__nightmare || window.navigator.webdriver);
    const noLanguages = !navigator.languages || navigator.languages.length === 0;

    return !!(isBotUA || isWebdriver || isHeadlessChrome || hasAutomationProperties || noLanguages);
}

function detectDeveloper() {
    const hostname = window.location.hostname || '';
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.endsWith('.local');
    const hasDevParam = new URLSearchParams(window.location.search).has('dev_mode') || new URLSearchParams(window.location.search).has('dev');
    const hasDevCookie = document.cookie.includes('cs_developer=1') || document.cookie.includes('cs_dev=1');
    const hasDevStorage = localStorage.getItem('cs_developer') === '1' || localStorage.getItem('cs_dev') === 'true';

    return !!(isLocal || hasDevParam || hasDevCookie || hasDevStorage);
}

// 3. Initialize Mixpanel with GDPR/CCPA Opt-Out Default
mixpanel.init('10d2f010eeaf3943b19d54c49771c6ac', {
    opt_out_tracking_by_default: true,
    track_pageview: true,
    persistence: 'localStorage'
});

// 4. Register Super Properties (Filters for Bot / Developer / Real User)
const isBot = detectBot();
const isDev = detectDeveloper();
const visitorType = isDev ? 'developer' : (isBot ? 'bot' : 'real_user');

mixpanel.register({
    'is_bot': isBot,
    'is_developer': isDev,
    'visitor_type': visitorType
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
            background: rgba(10, 10, 10, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 12px;
            padding: 20px 24px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 212, 255, 0.1);
            z-index: 99999;
            font-family: 'Inter', sans-serif;
            color: #cbd5e1;
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
            font-family: 'Orbitron', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.5px;
        }
        .cs-cookie-text {
            font-size: 0.8rem;
            line-height: 1.5;
            color: #94a3b8;
            margin: 0;
        }
        .cs-cookie-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
        }
        .cs-cookie-btn {
            font-family: 'Orbitron', sans-serif;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .cs-cookie-btn-accept {
            background: linear-gradient(135deg, #00d4ff, #7b2cff);
            color: #000;
            border: none;
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
        }
        .cs-cookie-btn-accept:hover {
            transform: translateY(-1px);
            box-shadow: 0 0 18px rgba(0, 212, 255, 0.5);
        }
        .cs-cookie-btn-decline {
            background: transparent;
            color: #94a3b8;
            border: 1px solid rgba(148, 163, 184, 0.2);
        }
        .cs-cookie-btn-decline:hover {
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.4);
            background: rgba(255, 255, 255, 0.03);
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
(function() {
    var originalGtag = window.gtag;
    window.gtag = function() {
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
                block: 'start'
            });
        }
    });
});

// Newsletter form handling
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
        const email = this.querySelector('input[type="email"]').value;
        if (!email) {
            e.preventDefault();
            alert('Please enter a valid email address.');
            return;
        }

        // Add loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Subscribing...';
        submitBtn.disabled = true;

        // Reset after a delay (form will actually submit)
        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 2000);
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
        behavior: 'smooth'
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
document.querySelectorAll('a[href*="affiliate"], a[href*="ref="], a[href*="?utm_"]').forEach(link => {
    link.addEventListener('click', function () {
        trackEvent('affiliate_click', {
            url: this.href,
            text: this.textContent.trim()
        });
    });
});

// Growth stack: zero-auth workspace + tool chaining on tool pages only
(function loadGrowthStack() {
    if (!/\/tools\//.test(location.pathname)) return;
    if (location.pathname.indexOf('/tools/shared') !== -1) return;

    var ver = '20260716b';
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/tools/shared/workspace.css?v=' + ver;
    document.head.appendChild(link);

    var r = document.createElement('script');
    r.src = '/tools/shared/tools-registry.js?v=' + ver;
    r.onerror = function () {
        console.warn('[CSWorkspace] tools-registry.js failed to load');
    };
    r.onload = function () {
        var w = document.createElement('script');
        w.src = '/tools/shared/workspace.js?v=' + ver;
        w.async = false;
        w.onerror = function () {
            console.warn('[CSWorkspace] workspace.js failed to load');
        };
        document.body.appendChild(w);
    };
    document.head.appendChild(r);
})();

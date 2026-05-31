// CyberScryb Website JavaScript

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

// GA4 Event Tracking
function trackEvent(eventName, eventData) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, eventData);
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

// Whole-card click — navigate to the first link in any .blog-card
document.querySelectorAll('.blog-card').forEach(card => {
    card.addEventListener('click', function (e) {
        if (e.target.closest('a')) return; // let real links handle themselves
        const link = card.querySelector('a[href]');
        if (link) window.location.href = link.href;
    });
});

// Track tool launches
document.querySelectorAll('a[href*="/tools/"]').forEach(link => {
    link.addEventListener('click', function () {
        const toolName = this.closest('.blog-card')?.querySelector('h3')?.textContent?.trim() || 'unknown';
        trackEvent('tool_launch', { tool_name: toolName });
    });
});

// Track newsletter signups
document.querySelectorAll('form[action*="subscribe"]').forEach(form => {
    form.addEventListener('submit', function () {
        trackEvent('newsletter_signup', { source: 'form' });
    });
});

// ─── Scroll Reveal Animations ───
if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
        revealObserver.observe(el);
    });
}

// ─── Cloudflare AI Chatbot ───
(function() {
    // Load the chatbot after page is interactive
    function loadChatbot() {
        if (document.querySelector('chat-bubble-snippet')) return;

        // Add the script
        var s = document.createElement('script');
        s.type = 'module';
        s.src = 'https://722da820-be39-4721-bc14-4e498d45d78b.search.ai.cloudflare.com/assets/v0.0.30/search-snippet.es.js';
        document.head.appendChild(s);

        // Add the element
        var chat = document.createElement('chat-bubble-snippet');
        document.body.appendChild(chat);

        // Add styling to match CyberScryb dark theme
        var style = document.createElement('style');
        style.textContent = 'chat-bubble-snippet { --search-snippet-primary-color: #141414; --search-snippet-primary-hover: #c41e1e; --search-snippet-focus-ring: #c41e1e; --search-snippet-text-color: #e0e0e0; --search-snippet-text-secondary: #ffffff; --search-snippet-text-description: #888; --search-snippet-border-color: #333; }';
        document.head.appendChild(style);
    }

    if (document.readyState === 'complete') {
        setTimeout(loadChatbot, 3000);
    } else {
        window.addEventListener('load', function() { setTimeout(loadChatbot, 3000); });
    }
})();


// Wave 12: Reveal-on-scroll via IntersectionObserver
// Adds .visible class to .reveal elements when they enter viewport.
(function() {
    if (typeof IntersectionObserver === 'undefined') return;
    var targets = document.querySelectorAll('.reveal, .reveal-stagger > *, .blog-card');
    if (!targets.length) return;
    var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Stagger: add slight delay per index within parent
                var idx = Array.prototype.indexOf.call(entry.target.parentNode.children, entry.target);
                if (idx > 0 && idx < 12) {
                    entry.target.style.transitionDelay = (idx * 60) + 'ms';
                }
                io.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    targets.forEach(function(t) {
        // Don't double-init if already revealed
        if (!t.classList.contains('visible')) {
            t.classList.add('reveal');
            io.observe(t);
        }
    });
})();

// CJ Affiliate page-based tracking (loads after user interaction to protect LCP)
(function() {
    function loadCJ() {
        if (window._cjLoaded) return;
        window._cjLoaded = true;
        var s = document.createElement('script');
        s.src = 'https://www.anrdoezrs.net/am/101754535/include/allCj/impressions/page/am.js';
        s.async = true;
        document.body.appendChild(s);
    }
    if (document.readyState === 'complete') {
        setTimeout(loadCJ, 3000);
    } else {
        window.addEventListener('load', function() { setTimeout(loadCJ, 3000); });
    }
    ['scroll', 'mousemove', 'touchstart', 'click'].forEach(function(ev) {
        window.addEventListener(ev, loadCJ, { once: true, passive: true });
    });
})();

// V3 — Cursor-follow spotlight on .blog-card tool cards
(function() {
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    function bind() {
        document.querySelectorAll('.blog-card').forEach(function(card) {
            if (card.dataset.spotlightBound) return;
            card.dataset.spotlightBound = '1';
            card.addEventListener('mousemove', function(e) {
                var r = card.getBoundingClientRect();
                card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
                card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
            }, { passive: true });
            card.addEventListener('mouseleave', function() {
                card.style.setProperty('--mx', '50%');
                card.style.setProperty('--my', '50%');
            });
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();

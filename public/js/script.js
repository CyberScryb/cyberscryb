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

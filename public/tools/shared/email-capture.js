/* CyberScryb Email Capture — shared logic
   Stores subscribers in localStorage for now.
   Swap to a backend/API (Mailchimp, ConvertKit, or custom) when ready. */

(function () {
    'use strict';

    // Inject the email capture bar into any page that includes this script
    const STORAGE_KEY = 'cs_email_subscribed';
    const LIST_KEY = 'cs_email_list';

    // Don't show if already subscribed
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Find insertion point — before footer or at end of main
    const footer = document.querySelector('footer');
    const main = document.querySelector('main');
    const insertTarget = footer || main;
    if (!insertTarget) return;

    // Create the bar
    const bar = document.createElement('div');
    bar.className = 'cs-email-bar';
    bar.innerHTML = `
        <h3>🔥 Get Pro Tips & New Tools First</h3>
        <p class="cs-email-sub">Join 500+ developers & marketers. One email per week. No spam.</p>
        <form class="cs-email-form" id="csEmailForm">
            <input type="email" class="cs-email-input" id="csEmailInput" placeholder="you@example.com" required>
            <button type="submit" class="cs-email-btn">Subscribe</button>
        </form>
        <div class="cs-email-success" id="csEmailSuccess">✓ You're in! Check your inbox.</div>
        <p class="cs-email-note">No spam. Unsubscribe anytime. Your data stays private.</p>
    `;

    // Insert before footer or append to main
    if (footer) {
        footer.parentNode.insertBefore(bar, footer);
    } else {
        main.appendChild(bar);
    }

    // Handle submission
    document.getElementById('csEmailForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('csEmailInput').value.trim();
        if (!email) return;

        // Store locally (replace with API call when ready)
        const list = JSON.parse(localStorage.getItem(LIST_KEY) || '[]');
        if (!list.includes(email)) {
            list.push(email);
            localStorage.setItem(LIST_KEY, JSON.stringify(list));
        }

        // Mark as subscribed
        localStorage.setItem(STORAGE_KEY, email);

        // Show success
        document.getElementById('csEmailForm').style.display = 'none';
        document.getElementById('csEmailSuccess').style.display = 'block';

        // Log for analytics
        console.log('[CyberScryb] New subscriber:', email);
    });
})();

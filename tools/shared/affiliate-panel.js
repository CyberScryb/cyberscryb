/**
 * CyberScryb Affiliate Recommendation Panel
 * Injects contextual product recommendations after tool usage.
 *
 * Affiliate links use placeholder URLs — swap with your real IDs:
 * - NordVPN: https://nordvpn.com/affiliate/
 * - 1Password: https://1password.com/affiliates (via CJ Affiliate)
 */

(function () {
  'use strict';

  // ─── Configuration ───
  const AFFILIATE_CONFIG = {
    'password-checker': {
      heading: '🛡️ Protect Your Accounts',
      message:
        'A strong password is just the start. Use a password manager for unique passwords on every account, and a VPN to encrypt your traffic.',
      links: [
        {
          text: 'Get 1Password →',
          // REPLACE with your real 1Password affiliate link
          url: 'https://1password.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'Password Manager — Never reuse passwords',
        },
        {
          text: 'Try NordVPN →',
          // REPLACE with your real NordVPN affiliate link
          url: 'https://nordvpn.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: false,
          subtitle: 'VPN — Encrypt your internet connection',
        },
      ],
      // Only show after the user has actually used the tool
      triggerSelector: '.result-card, .strength-meter, .password-result',
      disclosure:
        'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.',
    },
    'base64-tool': {
      heading: '⚡ Build Faster with Cloud Hosting',
      message: 'Deploy your apps with industry-leading cloud providers.',
      links: [
        {
          text: 'Try DigitalOcean →',
          url: 'https://www.digitalocean.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'Get $200 in free credits',
        },
      ],
      triggerSelector: '.output-area, .result',
      disclosure:
        'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.',
    },
  };

  // ─── Detect which tool we're on ───
  function detectTool() {
    const path = window.location.pathname;
    for (const toolKey of Object.keys(AFFILIATE_CONFIG)) {
      if (path.includes(toolKey)) return toolKey;
    }
    return null;
  }

  // ─── Create the affiliate panel HTML ───
  function createPanel(config) {
    const panel = document.createElement('div');
    panel.className = 'affiliate-panel';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'Recommended Products');

    const linksHtml = config.links
      .map(
        link => `
            <a href="${link.url}" class="affiliate-link${link.primary ? ' primary' : ''}" 
               target="_blank" rel="noopener sponsored" 
               title="${link.subtitle}">
                ${link.text}
            </a>
        `
      )
      .join('');

    panel.innerHTML = `
            <div class="affiliate-header">
                <span class="shield-icon">${config.heading.split(' ')[0]}</span>
                <span>${config.heading.replace(/^[^\s]+\s/, '')}</span>
            </div>
            <p>${config.message}</p>
            <div class="affiliate-links">
                ${linksHtml}
            </div>
            <p style="font-size:0.7rem; color:var(--text-muted,#666); margin-top:12px; margin-bottom:0;">
                ${config.disclosure}
            </p>
        `;

    return panel;
  }

  // ─── Inject the panel ───
  function injectPanel() {
    const toolKey = detectTool();
    if (!toolKey) return;

    const config = AFFILIATE_CONFIG[toolKey];
    const panel = createPanel(config);

    // Check if already shown
    if (document.querySelector('.affiliate-panel')) return;

    // Insert before footer
    const footer = document.querySelector('footer');
    if (footer) {
      footer.parentNode.insertBefore(panel, footer);
    } else {
      document.body.appendChild(panel);
    }
  }

  // ─── Initialize ───
  // Show panel after a short delay so user engages with tool first
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(injectPanel, 3000); // Show after 3 seconds of tool usage
    });
  } else {
    setTimeout(injectPanel, 3000);
  }
})();

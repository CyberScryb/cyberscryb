/**
 * CyberScryb Affiliate Recommendation Panel
 * Injects contextual product recommendations after tool usage.
 *
 * Affiliate links use placeholder URLs — swap with your real IDs:
 * - NordVPN: https://nordvpn.com/affiliate/
 * - 1Password: https://1password.com/affiliates (via CJ Affiliate)
 * - DigitalOcean: https://www.digitalocean.com/partners/
 * - Grammarly: https://www.grammarly.com/affiliates
 * - SurferSEO: https://surferseo.com/affiliate/
 * - Namecheap: https://www.namecheap.com/affiliates/
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
          url: 'https://1password.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'Password Manager — Never reuse passwords',
        },
        {
          text: 'Try NordVPN →',
          url: 'https://nordvpn.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: false,
          subtitle: 'VPN — Encrypt your internet connection',
        },
      ],
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
    humanizer: {
      heading: '✍️ Level Up Your Writing',
      message: 'Love the humanized results? These tools take your writing even further.',
      links: [
        {
          text: 'Try Grammarly Free →',
          url: 'https://grammarly.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'AI writing assistant — grammar, tone & clarity',
        },
      ],
      triggerSelector: '#output-text, .output-content',
      disclosure:
        'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.',
    },
    'gig-auto-pilot': {
      heading: '✍️ Sharpen Your Proposals',
      message: 'Polish your freelance proposals before sending them out.',
      links: [
        {
          text: 'Try Grammarly Free →',
          url: 'https://grammarly.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'AI writing assistant — grammar, tone & clarity',
        },
      ],
      triggerSelector: '.output-content, .result',
      disclosure:
        'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.',
    },
    'seo-tag-generator': {
      heading: '📈 Dominate Search Rankings',
      message: 'Great meta tags are step one. Take your SEO to the next level.',
      links: [
        {
          text: 'Try SurferSEO →',
          url: 'https://surferseo.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'AI-powered SEO content optimization',
        },
        {
          text: 'Get a Domain →',
          url: 'https://namecheap.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: false,
          subtitle: 'Namecheap — Domains from $1.98/yr',
        },
      ],
      triggerSelector: '.result-block, .output',
      disclosure:
        'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.',
    },
    'json-csv-converter': {
      heading: '⚡ Build & Deploy Faster',
      message: 'Working with data? Ship your next project on world-class infrastructure.',
      links: [
        {
          text: 'Try DigitalOcean →',
          url: 'https://www.digitalocean.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'Get $200 in free credits',
        },
      ],
      triggerSelector: '#output-area, .output',
      disclosure:
        'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.',
    },
    'markdown-html': {
      heading: '🌐 Publish Your Content',
      message: 'Got your HTML ready? Deploy it to the web in minutes.',
      links: [
        {
          text: 'Try DigitalOcean →',
          url: 'https://www.digitalocean.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'Get $200 in free credits',
        },
        {
          text: 'Get a Domain →',
          url: 'https://namecheap.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: false,
          subtitle: 'Namecheap — Domains from $1.98/yr',
        },
      ],
      triggerSelector: '.preview, .output',
      disclosure:
        'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.',
    },
    'color-palette': {
      heading: '🎨 Design Like a Pro',
      message: 'Love these colors? Build stunning websites with modern tools.',
      links: [
        {
          text: 'Try DigitalOcean →',
          url: 'https://www.digitalocean.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'Host your site — $200 free credits',
        },
      ],
      triggerSelector: '.palette, .colors',
      disclosure:
        'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.',
    },
    'qr-generator': {
      heading: '📱 Launch Your Business Online',
      message: 'Using QR codes for your business? Get a professional web presence.',
      links: [
        {
          text: 'Get a Domain →',
          url: 'https://namecheap.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'Namecheap — Domains from $1.98/yr',
        },
      ],
      triggerSelector: '#qr-output, canvas',
      disclosure:
        'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.',
    },
    'resume-bullets': {
      heading: '💼 Maximize Your Interview Callbacks',
      message:
        'Strong action bullets are essential. Test your full resume against automated Applicant Tracking Systems (ATS).',
      links: [
        {
          text: 'Grammarly Career Polish →',
          url: 'https://grammarly.com/?utm_source=cyberscryb&utm_medium=affiliate',
          primary: true,
          subtitle: 'Grammar, tone & executive clarity',
        },
      ],
      triggerSelector: '#output-text, .output-content, .lt-out',
      disclosure:
        'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.',
    },
    'landlord-tenant-letter': {
      heading: '⚖️ Protect Your Legal Paper Trail',
      message:
        'Always deliver formal notices via Certified Mail with Return Receipt or hand delivery with signed acknowledgment for legal proof.',
      links: [
        {
          text: 'Find Local Tenant Legal Aid →',
          url: 'https://www.lawhelp.org/',
          primary: true,
          subtitle: 'LawHelp.org — Free legal aid directory by state',
        },
      ],
      triggerSelector: '#output-text, .lt-out',
      disclosure:
        'Resource disclosure: Free public legal aid directories for tenant self-advocacy.',
    },
    'utility-shutoff-letter': {
      heading: '💡 Emergency Utility Assistance',
      message:
        'If you face immediate shutoff, apply for LIHEAP crisis grants and call 2-1-1 for local utility relief programs.',
      links: [
        {
          text: 'Find LIHEAP Grants by State →',
          url: 'https://www.acf.hhs.gov/ocs/low-income-home-energy-assistance-program-liheap',
          primary: true,
          subtitle: 'Official HHS Low-Income Energy Assistance',
        },
      ],
      triggerSelector: '#output-text, .lt-out',
      disclosure: 'Public benefit resource: Official federal & state energy assistance programs.',
    },
    'insurance-denial-appeal': {
      heading: '🏥 Patient Rights & External Review',
      message:
        'Under federal ACA rules, if your internal insurance appeal is denied, you have the right to an External Independent Medical Review by an outside doctor.',
      links: [
        {
          text: 'State Insurance Commissioner Directory →',
          url: 'https://content.naic.org/state-insurance-departments',
          primary: true,
          subtitle: 'NAIC — File a state regulatory complaint',
        },
      ],
      triggerSelector: '#output-text, .lt-out',
      disclosure: 'Regulatory guidance: National Association of Insurance Commissioners.',
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
                <span class="affiliate-subtitle">${link.subtitle}</span>
            </a>
        `
      )
      .join('');

    panel.innerHTML = `
            <div class="affiliate-header">
                <span>${config.heading}</span>
            </div>
            <p>${config.message}</p>
            <div class="affiliate-links">
                ${linksHtml}
            </div>
            <p style="font-size:0.7rem; color:var(--text-muted,#5C4A3D); margin-top:12px; margin-bottom:0;">
                ${config.disclosure}
            </p>
        `;

    // Add styles if not already present
    if (!document.querySelector('#affiliate-panel-styles')) {
      const style = document.createElement('style');
      style.id = 'affiliate-panel-styles';
      style.textContent = `
                .affiliate-panel {
                    max-width: 900px;
                    margin: 2rem auto;
                    padding: 2rem;
                    background: #FFFCF7;
                    border: 1px solid #E4D9C8;
                    border-radius: 12px;
                    text-align: center;
                }
                .affiliate-header {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #2C1810;
                    margin-bottom: 0.75rem;
                }
                .affiliate-panel p {
                    color: #5C4A3D;
                    font-size: 0.9rem;
                    line-height: 1.6;
                    margin-bottom: 1rem;
                }
                .affiliate-links {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                .affiliate-link {
                    display: inline-flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 700;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                    border: 1px solid #E4D9C8;
                    color: #3D2B1F;
                    background: #FFFFFF;
                }
                .affiliate-link.primary {
                    background: #C2410C;
                    color: #FFFCF7;
                    border-color: transparent;
                }
                .affiliate-link:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 16px rgba(194, 65, 12, 0.25);
                }
                .affiliate-subtitle {
                    font-size: 0.7rem;
                    font-weight: 400;
                    opacity: 0.7;
                    margin-top: 4px;
                }
                .affiliate-link.primary .affiliate-subtitle {
                    color: rgba(255, 252, 247, 0.75);
                }
            `;
      document.head.appendChild(style);
    }

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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(injectPanel, 3000);
    });
  } else {
    setTimeout(injectPanel, 3000);
  }
})();

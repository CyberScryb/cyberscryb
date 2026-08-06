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
            message: 'A strong password is just the start. Use a password manager for unique passwords on every account, and a VPN to encrypt your traffic.',
            links: [
                {
                    text: 'Get 1Password →',
                    url: 'https://1password.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: true,
                    subtitle: 'Password Manager — Never reuse passwords'
                },
                {
                    text: 'Try NordVPN →',
                    url: 'https://nordvpn.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: false,
                    subtitle: 'VPN — Encrypt your internet connection'
                }
            ],
            triggerSelector: '.result-card, .strength-meter, .password-result',
            disclosure: 'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.'
        },
        'base64-tool': {
            heading: '⚡ Build Faster with Cloud Hosting',
            message: 'Deploy your apps with industry-leading cloud providers.',
            links: [
                {
                    text: 'Try DigitalOcean →',
                    url: 'https://www.digitalocean.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: true,
                    subtitle: 'Get $200 in free credits'
                }
            ],
            triggerSelector: '.output-area, .result',
            disclosure: 'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.'
        },
        'humanizer': {
            heading: '✍️ Level Up Your Writing',
            message: 'Love the humanized results? These tools take your writing even further.',
            links: [
                {
                    text: 'Try Grammarly Free →',
                    url: 'https://grammarly.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: true,
                    subtitle: 'AI writing assistant — grammar, tone & clarity'
                }
            ],
            triggerSelector: '#output-text, .output-content',
            disclosure: 'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.'
        },
        'gig-auto-pilot': {
            heading: '✍️ Sharpen Your Proposals',
            message: 'Polish your freelance proposals before sending them out.',
            links: [
                {
                    text: 'Try Grammarly Free →',
                    url: 'https://grammarly.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: true,
                    subtitle: 'AI writing assistant — grammar, tone & clarity'
                }
            ],
            triggerSelector: '.output-content, .result',
            disclosure: 'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.'
        },
        'seo-tag-generator': {
            heading: '📈 Dominate Search Rankings',
            message: 'Great meta tags are step one. Take your SEO to the next level.',
            links: [
                {
                    text: 'Try SurferSEO →',
                    url: 'https://surferseo.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: true,
                    subtitle: 'AI-powered SEO content optimization'
                },
                {
                    text: 'Get a Domain →',
                    url: 'https://namecheap.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: false,
                    subtitle: 'Namecheap — Domains from $1.98/yr'
                }
            ],
            triggerSelector: '.result-block, .output',
            disclosure: 'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.'
        },
        'json-csv-converter': {
            heading: '⚡ Build & Deploy Faster',
            message: 'Working with data? Ship your next project on world-class infrastructure.',
            links: [
                {
                    text: 'Try DigitalOcean →',
                    url: 'https://www.digitalocean.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: true,
                    subtitle: 'Get $200 in free credits'
                }
            ],
            triggerSelector: '#output-area, .output',
            disclosure: 'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.'
        },
        'markdown-html': {
            heading: '🌐 Publish Your Content',
            message: 'Got your HTML ready? Deploy it to the web in minutes.',
            links: [
                {
                    text: 'Try DigitalOcean →',
                    url: 'https://www.digitalocean.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: true,
                    subtitle: 'Get $200 in free credits'
                },
                {
                    text: 'Get a Domain →',
                    url: 'https://namecheap.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: false,
                    subtitle: 'Namecheap — Domains from $1.98/yr'
                }
            ],
            triggerSelector: '.preview, .output',
            disclosure: 'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.'
        },
        'color-palette': {
            heading: '🎨 Design Like a Pro',
            message: 'Love these colors? Build stunning websites with modern tools.',
            links: [
                {
                    text: 'Try DigitalOcean →',
                    url: 'https://www.digitalocean.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: true,
                    subtitle: 'Host your site — $200 free credits'
                }
            ],
            triggerSelector: '.palette, .colors',
            disclosure: 'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.'
        },
        'qr-generator': {
            heading: '📱 Launch Your Business Online',
            message: 'Using QR codes for your business? Get a professional web presence.',
            links: [
                {
                    text: 'Get a Domain →',
                    url: 'https://namecheap.com/?utm_source=cyberscryb&utm_medium=affiliate',
                    primary: true,
                    subtitle: 'Namecheap — Domains from $1.98/yr'
                }
            ],
            triggerSelector: '#qr-output, canvas',
            disclosure: 'Affiliate disclosure: We may earn a commission if you purchase through these links, at no extra cost to you.'
        }
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

        const linksHtml = config.links.map(link => `
            <a href="${link.url}" class="affiliate-link${link.primary ? ' primary' : ''}"
               target="_blank" rel="noopener sponsored"
               title="${link.subtitle}">
                ${link.text}
                <span class="affiliate-subtitle">${link.subtitle}</span>
            </a>
        `).join('');

        panel.innerHTML = `
            <div class="affiliate-header">
                <span>${config.heading}</span>
            </div>
            <p>${config.message}</p>
            <div class="affiliate-links">
                ${linksHtml}
            </div>
            <p style="font-size:0.7rem; color:var(--text-muted,#666); margin-top:12px; margin-bottom:0;">
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
                    background: #18181b;
                    border: 1px solid #333;
                    border-radius: 12px;
                    text-align: center;
                }
                .affiliate-header {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 0.75rem;
                }
                .affiliate-panel p {
                    color: #999;
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
                    border: 1px solid #333;
                    color: #ccc;
                    background: rgba(255,255,255,0.03);
                }
                .affiliate-link.primary {
                    background: #C2410C;
                    color: #000;
                    border-color: transparent;
                }
                .affiliate-link:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 16px rgba(123, 44, 255, 0.2);
                }
                .affiliate-subtitle {
                    font-size: 0.7rem;
                    font-weight: 400;
                    opacity: 0.7;
                    margin-top: 4px;
                }
                .affiliate-link.primary .affiliate-subtitle {
                    color: rgba(0,0,0,0.6);
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

/**
 * Capture real product screenshots from live CyberScryb tools.
 * Outputs WebP-ready PNGs under public/images/product/
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'images', 'product');
const base = process.env.CS_BASE || 'https://cyberscryb.com';

const shots = [
  {
    id: 'humanizer',
    url: '/tools/humanizer/',
    width: 1280,
    height: 820,
    prepare: async (page) => {
      // Prefer a filled UI so the shot shows the product working
      const selectors = [
        'textarea',
        '#input-text',
        '#humanizer-input',
        '[name="text"]',
        '.input-area textarea',
      ];
      for (const sel of selectors) {
        const el = page.locator(sel).first();
        if (await el.count()) {
          await el.fill(
            'In today\'s fast-paced digital landscape, leveraging cutting-edge solutions is paramount to achieving synergistic outcomes and driving stakeholder value across the entire organization.'
          );
          break;
        }
      }
      // Try run if a primary button exists (don't fail if free-tier needs wait)
      const btn = page.locator('button:has-text("Humanize"), button:has-text("Rewrite"), button:has-text("Process"), button.primary, .cta-button').first();
      if (await btn.count()) {
        try {
          await btn.click({ timeout: 2000 });
          await page.waitForTimeout(2500);
        } catch {
          /* still capture empty-ish UI */
        }
      }
    },
  },
  {
    id: 'gig-auto-pilot',
    url: '/tools/gig-auto-pilot/',
    width: 1280,
    height: 820,
    prepare: async (page) => {
      const ta = page.locator('textarea').first();
      if (await ta.count()) {
        await ta.fill(
          'Looking for a React developer to build a dashboard for a SaaS analytics product. Must know TypeScript and Tailwind. Budget $500–$800. Timeline 2 weeks.'
        );
      }
    },
  },
  {
    id: 'password-checker',
    url: '/tools/password-checker/',
    width: 1280,
    height: 820,
    prepare: async (page) => {
      const input = page.locator('input[type="password"], input[type="text"], #password, #pw-input').first();
      if (await input.count()) {
        await input.fill('truck.maple.glasses.orbit.lunar');
        await input.dispatchEvent('input');
        await page.waitForTimeout(400);
      }
    },
  },
  {
    id: 'json-csv',
    url: '/tools/json-csv-converter/',
    width: 1280,
    height: 820,
    prepare: async (page) => {
      const ta = page.locator('textarea').first();
      if (await ta.count()) {
        await ta.fill('[{"id":1,"name":"Ada","role":"Engineer"},{"id":2,"name":"Grace","role":"Founder"}]');
        await ta.dispatchEvent('input');
        await page.waitForTimeout(500);
      }
    },
  },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });

  // Skip consent banners if present
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cs_cookie_consent', 'accepted');
      localStorage.setItem('_iub_cs-98273641', JSON.stringify({ consent: true }));
    } catch {}
  });

  for (const shot of shots) {
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    const url = base + shot.url;
    console.log('Capturing', shot.id, url);
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);

    // Dismiss common cookie/banner overlays
    for (const label of ['Accept', 'Accept all', 'I agree', 'Got it', 'Close']) {
      const b = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
      if (await b.count()) {
        try {
          await b.click({ timeout: 1500 });
        } catch {}
      }
    }
    // Hide fixed cookie widgets if still visible
    await page.addStyleTag({
      content: `
        #iubenda-cs-banner, .iubenda-cs-container, [id*="cookie"], .cookie-banner { display: none !important; }
        body { overflow: auto !important; }
      `,
    });

    if (shot.prepare) await shot.prepare(page);
    await page.waitForTimeout(600);

    const outPath = path.join(outDir, `${shot.id}.png`);
    // Prefer main content region when possible
    const main = page.locator('main, .tool-container, .container, body').first();
    const box = await main.boundingBox();
    if (box && box.height > 200) {
      await page.screenshot({
        path: outPath,
        type: 'png',
        clip: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.min(box.width, shot.width),
          height: Math.min(Math.max(box.height, 480), 720),
        },
      });
    } else {
      await page.screenshot({ path: outPath, type: 'png', fullPage: false });
    }
    console.log('  wrote', outPath);
    await page.close();
  }

  // Hero composite: humanizer full viewport crop
  const page = await context.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(base + '/tools/humanizer/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.addStyleTag({
    content: `#iubenda-cs-banner, .iubenda-cs-container { display: none !important; }`,
  });
  const ta = page.locator('textarea').first();
  if (await ta.count()) {
    await ta.fill(
      'In today\'s fast-paced digital landscape, leveraging cutting-edge solutions is paramount to achieving synergistic outcomes.'
    );
  }
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(outDir, 'hero-humanizer.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1400, height: 780 },
  });
  console.log('  wrote hero-humanizer.png');

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

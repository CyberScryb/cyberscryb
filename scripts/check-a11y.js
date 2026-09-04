const axe = require('axe-core');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const TARGET_PAGES = [
  'public/index.html',
  'public/tools/humanizer/index.html',
  'public/tools/code-explainer/index.html',
  'public/blog/index.html',
  'public/guides/index.html',
  'public/tools.html',
  'public/blog/how-to-dispute-medical-bill-coding-errors-charity-care-2026.html',
  'public/blog/how-to-get-security-deposit-back-state-deadlines-2026.html',
  'public/blog/how-to-cancel-gym-membership-ftc-click-to-cancel-2026.html',
  'public/blog/how-to-dispute-hoa-fines-selective-enforcement-2026.html',
];

async function runAudit() {
  console.log('Running accessibility check with axe-core across key pages...\n');
  let hasFailure = false;
  let auditedCount = 0;

  for (const relPath of TARGET_PAGES) {
    const fullPath = path.resolve(__dirname, '..', relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[WARN] File not found: ${relPath}`);
      continue;
    }

    const html = fs.readFileSync(fullPath, 'utf8');
    const dom = new JSDOM(html, { runScripts: 'outside-only' });

    // Run axe with color-contrast disabled since JSDOM does not render layout geometry
    const results = await axe.run(dom.window.document.documentElement, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    auditedCount++;
    if (results.violations.length > 0) {
      hasFailure = true;
      console.error(
        `❌ [FAIL] ${relPath} has ${results.violations.length} accessibility violation(s):`
      );
      for (const v of results.violations) {
        console.error(`   • [${v.impact || 'minor'}] ${v.id}: ${v.help} (${v.helpUrl})`);
        for (const n of v.nodes) {
          console.error(`       Target: ${n.target.join(' ')}`);
          if (n.failureSummary) {
            console.error(`       Reason: ${n.failureSummary.replace(/\n/g, ' ')}`);
          }
        }
      }
      console.error('');
    } else {
      console.log(`✅ [PASS] ${relPath} (0 violations, ${results.passes.length} checks passed)`);
    }
  }

  console.log(`\nAudit complete: ${auditedCount} pages tested.`);
  if (hasFailure) {
    console.error('Accessibility audit failed with violations.');
    process.exit(1);
  } else {
    console.log('All pages passed accessibility checks cleanly!');
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('Unexpected error running a11y audit:', err);
  process.exit(1);
});

/**
 * WCAG Contrast Checker Accessibility & Functionality Tests
 *
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('WCAG Contrast Checker', () => {
  let doc;

  beforeEach(() => {
    const htmlPath = path.join(__dirname, '../content-site/tools/contrast-checker/index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    document.documentElement.innerHTML = htmlContent;
    doc = document;

    // Load and execute script
    const scriptPath = path.join(__dirname, '../content-site/tools/contrast-checker/script.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    // Trigger DOMContentLoaded
    eval(scriptContent);
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  test('color pickers and hex inputs have descriptive aria-label attributes', () => {
    const fgPicker = doc.getElementById('fgPicker');
    const fgHex = doc.getElementById('fgHex');
    const bgPicker = doc.getElementById('bgPicker');
    const bgHex = doc.getElementById('bgHex');

    expect(fgPicker.getAttribute('aria-label')).toBe('Text color picker');
    expect(fgHex.getAttribute('aria-label')).toBe('Text color hex code');
    expect(bgPicker.getAttribute('aria-label')).toBe('Background color picker');
    expect(bgHex.getAttribute('aria-label')).toBe('Background color hex code');
  });

  test('has a Swap Colors button with aria-label', () => {
    const btnSwap = doc.getElementById('btnSwap');
    expect(btnSwap).not.toBeNull();
    expect(btnSwap.getAttribute('aria-label')).toBe('Swap text and background colors');
  });

  test('has an aria-live region for screen reader announcements', () => {
    const a11yStatus = doc.getElementById('a11yStatus');
    expect(a11yStatus).not.toBeNull();
    expect(a11yStatus.getAttribute('aria-live')).toBe('polite');
  });

  test('swapping colors swaps values and updates live status', () => {
    const fgHex = doc.getElementById('fgHex');
    const bgHex = doc.getElementById('bgHex');
    const btnSwap = doc.getElementById('btnSwap');
    const a11yStatus = doc.getElementById('a11yStatus');

    const initialFg = fgHex.value;
    const initialBg = bgHex.value;

    btnSwap.click();

    expect(fgHex.value).toBe(initialBg);
    expect(bgHex.value).toBe(initialFg);
    expect(a11yStatus.textContent).toContain('Swapped colors');
  });
});

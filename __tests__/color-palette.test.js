/**
 * Color Palette Generator UX & Accessibility Tests
 *
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Color Palette Generator — UX & Accessibility', () => {
  const htmlPath = path.resolve(__dirname, '../content-site/tools/color-palette/index.html');
  const cssPath = path.resolve(__dirname, '../content-site/tools/color-palette/style.css');
  const jsPath = path.resolve(__dirname, '../content-site/tools/color-palette/script.js');

  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  test('form controls have associated labels with for attributes', () => {
    expect(html).toContain('<label for="baseColor">');
    expect(html).toContain('<label for="harmony">');
    expect(html).toContain('<label for="count">');
    expect(html).toContain('id="baseColor"');
    expect(html).toContain('id="harmony"');
    expect(html).toContain('id="count"');
  });

  test('contains aria-live status container for screen reader announcements', () => {
    expect(html).toContain('id="palette-status"');
    expect(html).toContain('aria-live="polite"');
  });

  test('swatch CSS contains focus-visible styling for keyboard users', () => {
    expect(css).toMatch(/\.color-swatch:focus-visible\s*\{[^}]*outline:/);
    expect(css).toMatch(/\.color-swatch:focus-visible\s*\.swatch-hex\s*\{[^}]*opacity:\s*1/);
  });

  test('renders accessible buttons for each color swatch and updates status on copy', () => {
    document.body.innerHTML = `
      <input type="color" id="baseColor" value="#DC2626">
      <input type="text" id="hexInput" value="#DC2626">
      <select id="harmony"><option value="monochromatic" selected>Monochromatic</option></select>
      <select id="count"><option value="5" selected>5</option></select>
      <div class="palette" id="palette"></div>
      <p id="palette-status" aria-live="polite"></p>
      <div id="exportCode"></div>
    `;

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    // Execute script in jsdom
    window.eval(js);

    const swatches = document.querySelectorAll('#palette button.color-swatch');
    expect(swatches.length).toBe(5);

    const firstSwatch = swatches[0];
    expect(firstSwatch.getAttribute('type')).toBe('button');
    expect(firstSwatch.getAttribute('aria-label')).toMatch(/^Copy color #[0-9A-F]{6}$/i);
    expect(firstSwatch.getAttribute('title')).toMatch(/^Click to copy #[0-9A-F]{6}$/i);

    // Simulate clicking or pressing Enter on the swatch
    firstSwatch.click();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringMatching(/^#[0-9A-F]{6}$/i)
    );
    expect(firstSwatch.getAttribute('aria-label')).toMatch(/^Copied #[0-9A-F]{6}!$/i);

    const statusEl = document.getElementById('palette-status');
    expect(statusEl.textContent).toMatch(/^Copied #[0-9A-F]{6} to clipboard\.$/i);
  });
});

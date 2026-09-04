/* WCAG Color Contrast Checker JS Logic */

document.addEventListener('DOMContentLoaded', () => {
  const fgPicker = document.getElementById('fgPicker');
  const fgHex = document.getElementById('fgHex');
  const bgPicker = document.getElementById('bgPicker');
  const bgHex = document.getElementById('bgHex');

  const ratioVal = document.getElementById('ratioVal');
  const previewBox = document.getElementById('previewBox');
  const previewNormal = document.getElementById('previewNormal');
  const previewLarge = document.getElementById('previewLarge');

  const cardNormalAA = document.getElementById('cardNormalAA');
  const badgeNormalAA = document.getElementById('badgeNormalAA');
  const cardNormalAAA = document.getElementById('cardNormalAAA');
  const badgeNormalAAA = document.getElementById('badgeNormalAAA');
  const cardLargeAA = document.getElementById('cardLargeAA');
  const badgeLargeAA = document.getElementById('badgeLargeAA');
  const cardLargeAAA = document.getElementById('cardLargeAAA');
  const badgeLargeAAA = document.getElementById('badgeLargeAAA');

  const btnAutoAA = document.getElementById('btnAutoAA');
  const btnAutoAAA = document.getElementById('btnAutoAAA');

  // Attach listeners
  fgPicker.addEventListener('input', () => {
    fgHex.value = fgPicker.value.toUpperCase();
    calculateContrast();
  });

  bgPicker.addEventListener('input', () => {
    bgHex.value = bgPicker.value.toUpperCase();
    calculateContrast();
  });

  fgHex.addEventListener('input', () => {
    let val = fgHex.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (isValidHex(val)) {
      fgPicker.value = val;
      calculateContrast();
    }
  });

  bgHex.addEventListener('input', () => {
    let val = bgHex.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (isValidHex(val)) {
      bgPicker.value = val;
      calculateContrast();
    }
  });

  btnAutoAA.addEventListener('click', () => optimizeContrast(4.5));
  btnAutoAAA.addEventListener('click', () => optimizeContrast(7.0));

  // Initial calculation
  calculateContrast();

  function calculateContrast() {
    const fg = fgPicker.value;
    const bg = bgPicker.value;

    const fgRgb = hexToRgb(fg);
    const bgRgb = hexToRgb(bg);

    const fgLuminance = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
    const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

    const ratio = getContrastRatio(fgLuminance, bgLuminance);

    // Display ratio
    ratioVal.textContent = `${ratio.toFixed(2)}:1`;

    // Update preview styles
    previewBox.style.backgroundColor = bg;
    previewNormal.style.color = fg;
    previewLarge.style.color = fg;

    // AA/AAA checks
    updateStatusCard(cardNormalAA, badgeNormalAA, ratio >= 4.5);
    updateStatusCard(cardNormalAAA, badgeNormalAAA, ratio >= 7.0);
    updateStatusCard(cardLargeAA, badgeLargeAA, ratio >= 3.0);
    updateStatusCard(cardLargeAAA, badgeLargeAAA, ratio >= 4.5);
  }

  function updateStatusCard(card, badge, passes) {
    if (passes) {
      card.className = 'status-card pass-state';
      badge.textContent = 'PASS';
    } else {
      card.className = 'status-card fail-state';
      badge.textContent = 'FAIL';
    }
  }

  function optimizeContrast(targetRatio) {
    const fg = fgPicker.value;
    const bg = bgPicker.value;

    const fgRgb = hexToRgb(fg);
    const bgRgb = hexToRgb(bg);

    const fgLum = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
    const bgLum = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

    let currentRatio = getContrastRatio(fgLum, bgLum);

    // If it already passes, no adjustment needed
    if (currentRatio >= targetRatio) return;

    // Convert fg to HSL to adjust lightness
    const hsl = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
    let h = hsl[0],
      s = hsl[1],
      l = hsl[2];

    // Determine if we need to make it lighter or darker
    // We look at the background luminance to decide
    const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

    let bestHex = fg;
    let bestDiff = Infinity;

    // Sweep lightness space from 0 to 100 to find the closest color that meets target
    for (let checkL = 0; checkL <= 100; checkL += 0.5) {
      const checkRgb = hslToRgb(h, s, checkL);
      const checkLum = getRelativeLuminance(checkRgb[0], checkRgb[1], checkRgb[2]);
      const checkRatio = getContrastRatio(checkLum, bgLuminance);

      if (checkRatio >= targetRatio) {
        const diff = Math.abs(checkL - l);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestHex = rgbToHex(checkRgb[0], checkRgb[1], checkRgb[2]);
        }
      }
    }

    // Apply best match if found
    fgPicker.value = bestHex;
    fgHex.value = bestHex.toUpperCase();
    calculateContrast();
  }

  function isValidHex(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex);
  }

  function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function getRelativeLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getContrastRatio(lum1, lum2) {
    const l1 = Math.max(lum1, lum2);
    const l2 = Math.min(lum1, lum2);
    return (l1 + 0.05) / (l2 + 0.05);
  }

  // HSL Helpers
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
});

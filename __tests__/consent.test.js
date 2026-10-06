/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../content-site/js/consent.js'), 'utf8');

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '<main></main><footer></footer>';
  localStorage.clear();
  window.dataLayer = [];
});

function start() {
  window.eval(source);
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

test('new visitors receive one accessible banner and no optional vendor scripts', () => {
  start();
  expect(document.querySelectorAll('#cs-cookie-banner')).toHaveLength(1);
  expect(document.querySelector('#cs-cookie-banner').getAttribute('role')).toBe('region');
  expect(document.querySelectorAll('script[src]')).toHaveLength(0);
  expect(window['ga-disable-G-LS46B9J1XK']).toBe(true);
  window.gtag('event', 'tool_used');
  expect(window.dataLayer.some(args => args[0] === 'event')).toBe(false);
});

test('declining keeps scripts disabled; preferences can later enable both providers', () => {
  start();
  document.querySelector('#cs-cookie-decline').click();
  expect(localStorage.getItem('cs_cookie_consent')).toBe('declined');
  expect(document.querySelectorAll('script[src]')).toHaveLength(0);
  document.querySelector('#cs-cookie-settings').click();
  document.querySelector('#cs-cookie-accept').click();
  expect(window['ga-disable-G-LS46B9J1XK']).toBe(false);
  expect(localStorage.getItem('cs_cookie_consent')).toBe('accepted');
  expect(document.querySelectorAll('#cs-ga, #cs-ads')).toHaveLength(2);
  expect(
    window.dataLayer.some(
      args => args[0] === 'consent' && args[1] === 'update' && args[2].ad_storage === 'granted'
    )
  ).toBe(true);
  window.CSConsent.showPreferences();
  document.querySelector('#cs-cookie-accept').click();
  expect(document.querySelectorAll('#cs-ga, #cs-ads')).toHaveLength(2);
});

test('a saved decline is respected immediately', () => {
  localStorage.setItem('cs_cookie_consent', 'declined');
  start();
  expect(document.querySelector('#cs-cookie-banner')).toBeNull();
  expect(document.querySelectorAll('script[src]')).toHaveLength(0);
});

test('accepted consent does not load ads on a noindex page', () => {
  localStorage.setItem('cs_cookie_consent', 'accepted');
  document.head.innerHTML = '<meta name="robots" content="noindex,follow">';
  start();
  expect(document.querySelector('#cs-ga')).not.toBeNull();
  expect(document.querySelector('#cs-ads')).toBeNull();
});

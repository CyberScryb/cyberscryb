// Distill Extension Popup Script
// Handles opening reader view and tracking

(function () {
  'use strict';

  const openReaderBtn = document.getElementById('openReader');
  if (!openReaderBtn) return;

  openReaderBtn.addEventListener('click', async () => {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) return;

      // Check if we can inject into this tab
      const url = tab.url || '';
      if (
        url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:')
      ) {
        // Can't inject into browser pages
        showNotification('Cannot use Distill on this page');
        return;
      }

      // Inject the reader script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });

      // Close popup
      window.close();
    } catch (error) {
      console.error('Distill: Failed to open reader', error);
      showNotification('Failed to open reader. Try refreshing the page.');
    }
  });

  function showNotification(message) {
    const btn = document.getElementById('openReader');
    const originalText = btn.innerHTML;
    btn.innerHTML = message;
    btn.disabled = true;
    btn.style.background = '#dc2626';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.style.background = '';
    }, 2000);
  }

  // Track popup open for analytics
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ type: 'POPUP_OPENED' }).catch(() => {});
  }
})();

// The download is a normal HTML link and works with JavaScript disabled.
(function () {
  const link = document.querySelector('#pack-download a[download]');
  if (!link) return;
  link.addEventListener('click', function () {
    document.dispatchEvent(
      new CustomEvent('cs:tool-result', {
        detail: { toolId: 'caregiver-printable-pack', outputId: 'pack-download' },
      })
    );
  });
})();

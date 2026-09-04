/* Subnet Calculator JS Logic */

document.addEventListener('DOMContentLoaded', () => {
  const ipInput = document.getElementById('ipInput');
  const cidrSelect = document.getElementById('cidrSelect');
  const calcError = document.getElementById('calcError');
  const calcResults = document.getElementById('calcResults');

  const resSubnet = document.getElementById('resSubnet');
  const resNetwork = document.getElementById('resNetwork');
  const resRange = document.getElementById('resRange');
  const resBroadcast = document.getElementById('resBroadcast');
  const resHosts = document.getElementById('resHosts');
  const resWildcard = document.getElementById('resWildcard');

  const binIp = document.getElementById('binIp');
  const binMask = document.getElementById('binMask');
  const binNet = document.getElementById('binNet');
  const binBroad = document.getElementById('binBroad');

  // Populate CIDR dropdown (1 to 32)
  for (let i = 1; i <= 32; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `/${i} (${cidrToMask(i)})`;
    if (i === 24) opt.selected = true;
    cidrSelect.appendChild(opt);
  }

  // Attach listeners
  ipInput.addEventListener('input', calculateSubnet);
  cidrSelect.addEventListener('change', calculateSubnet);

  // Initial calculation
  calculateSubnet();

  function calculateSubnet() {
    const ipVal = ipInput.value.trim();
    const cidr = parseInt(cidrSelect.value, 10);

    // Validate IP
    if (!validateIp(ipVal)) {
      calcError.textContent = 'Invalid IPv4 address. Enter four numbers (0-255) separated by dots.';
      clearResults();
      return;
    }

    calcError.textContent = '';

    // Parsing IP to 32-bit Integer
    const ipInt = ipToLong(ipVal);
    const maskInt = cidrToLongMask(cidr);

    const netInt = ipInt & maskInt;
    const wildcardInt = ~maskInt;
    const broadcastInt = netInt | wildcardInt;

    // Dotted Decimal Results
    const subnetMaskStr = longToIp(maskInt);
    const networkStr = longToIp(netInt);
    const broadcastStr = longToIp(broadcastInt);
    const wildcardStr = longToIp(wildcardInt);

    // Usable hosts and Usable Range
    let usableHosts = 0;
    let rangeStr = '';

    if (cidr === 32) {
      usableHosts = 1;
      rangeStr = ipVal;
    } else if (cidr === 31) {
      usableHosts = 2;
      rangeStr = `${longToIp(netInt)} - ${longToIp(broadcastInt)}`;
    } else {
      usableHosts = Math.pow(2, 32 - cidr) - 2;
      const firstUsable = longToIp(netInt + 1);
      const lastUsable = longToIp(broadcastInt - 1);
      rangeStr = `${firstUsable} - ${lastUsable}`;
    }

    // Render Results
    resSubnet.textContent = subnetMaskStr;
    resNetwork.textContent = networkStr;
    resRange.textContent = rangeStr;
    resBroadcast.textContent = broadcastStr;
    resHosts.textContent = usableHosts.toLocaleString();
    resWildcard.textContent = wildcardStr;

    // Binary alignment with dots
    binIp.textContent = toBinaryString(ipInt);
    binMask.textContent = toBinaryString(maskInt);
    binNet.textContent = toBinaryString(netInt);
    binBroad.textContent = toBinaryString(broadcastInt);
  }

  function validateIp(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = Number(part);
      return part !== '' && !isNaN(num) && num >= 0 && num <= 255 && part.match(/^\d+$/);
    });
  }

  function ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  function longToIp(long) {
    return [(long >>> 24) & 255, (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
  }

  function cidrToLongMask(cidr) {
    return (cidr === 0 ? 0 : ~0 << (32 - cidr)) >>> 0;
  }

  function cidrToMask(cidr) {
    return longToIp(cidrToLongMask(cidr));
  }

  function toBinaryString(long) {
    const raw = (long >>> 0).toString(2).padStart(32, '0');
    return [
      raw.substring(0, 8),
      raw.substring(8, 16),
      raw.substring(16, 24),
      raw.substring(24, 32),
    ].join('.');
  }

  function clearResults() {
    resSubnet.textContent = '—';
    resNetwork.textContent = '—';
    resRange.textContent = '—';
    resBroadcast.textContent = '—';
    resHosts.textContent = '—';
    resWildcard.textContent = '—';

    binIp.textContent = '—';
    binMask.textContent = '—';
    binNet.textContent = '—';
    binBroad.textContent = '—';
  }
});

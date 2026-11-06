/* Subnet Calculator JS Logic */

function validateIp(ip) {
  if (typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    const num = Number(part);
    return part !== '' && !isNaN(num) && num >= 0 && num <= 255 && Boolean(part.match(/^\d+$/));
  });
}

function ipToLong(ip) {
  return (
    ip
      .trim()
      .split('.')
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
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

function computeSubnet(ipVal, cidr) {
  const trimmedIp = typeof ipVal === 'string' ? ipVal.trim() : '';
  const parsedCidr = parseInt(cidr, 10);

  if (!validateIp(trimmedIp) || isNaN(parsedCidr) || parsedCidr < 0 || parsedCidr > 32) {
    return { valid: false };
  }

  const ipInt = ipToLong(trimmedIp);
  const maskInt = cidrToLongMask(parsedCidr);

  const netInt = (ipInt & maskInt) >>> 0;
  const wildcardInt = ~maskInt >>> 0;
  const broadcastInt = (netInt | wildcardInt) >>> 0;

  const subnetMask = longToIp(maskInt);
  const wildcardMask = longToIp(wildcardInt);
  const binIp = toBinaryString(ipInt);
  const binMask = toBinaryString(maskInt);

  let usableHosts = 0;
  let usableRange = '';
  let networkAddress = '';
  let broadcastAddress = '';
  let binNet = '';
  let binBroad = '';

  if (parsedCidr === 32) {
    usableHosts = 1;
    usableRange = longToIp(ipInt);
    networkAddress = 'None (/32 single host)';
    broadcastAddress = 'None (/32 single host)';
    binNet = 'N/A (/32 single host)';
    binBroad = 'N/A (/32 single host)';
  } else if (parsedCidr === 31) {
    usableHosts = 2;
    usableRange = `${longToIp(netInt)} - ${longToIp(broadcastInt)}`;
    networkAddress = 'None (RFC 3021 /31)';
    broadcastAddress = 'None (RFC 3021 /31)';
    binNet = `${toBinaryString(netInt)} (Host 0, RFC 3021)`;
    binBroad = `${toBinaryString(broadcastInt)} (Host 1, RFC 3021)`;
  } else {
    usableHosts = Math.pow(2, 32 - parsedCidr) - 2;
    const firstUsable = longToIp(netInt + 1);
    const lastUsable = longToIp(broadcastInt - 1);
    usableRange = `${firstUsable} - ${lastUsable}`;
    networkAddress = longToIp(netInt);
    broadcastAddress = longToIp(broadcastInt);
    binNet = toBinaryString(netInt);
    binBroad = toBinaryString(broadcastInt);
  }

  return {
    valid: true,
    subnetMask,
    networkAddress,
    usableRange,
    broadcastAddress,
    usableHosts,
    wildcardMask,
    binIp,
    binMask,
    binNet,
    binBroad,
  };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const ipInput = document.getElementById('ipInput');
    const cidrSelect = document.getElementById('cidrSelect');
    const calcError = document.getElementById('calcError');

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

    if (!ipInput || !cidrSelect) return;

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
      const result = computeSubnet(ipVal, cidr);

      if (!result.valid) {
        calcError.textContent =
          'Invalid IPv4 address. Enter four numbers (0-255) separated by dots.';
        clearResults();
        return;
      }

      calcError.textContent = '';

      resSubnet.textContent = result.subnetMask;
      resNetwork.textContent = result.networkAddress;
      resRange.textContent = result.usableRange;
      resBroadcast.textContent = result.broadcastAddress;
      resHosts.textContent = result.usableHosts.toLocaleString();
      resWildcard.textContent = result.wildcardMask;

      binIp.textContent = result.binIp;
      binMask.textContent = result.binMask;
      binNet.textContent = result.binNet;
      binBroad.textContent = result.binBroad;
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
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeSubnet,
    validateIp,
    ipToLong,
    longToIp,
    cidrToLongMask,
    cidrToMask,
    toBinaryString,
  };
}

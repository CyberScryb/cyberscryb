/**
 * @jest-environment node
 */

const {
  computeSubnet,
  validateIp,
  ipToLong,
  longToIp,
  cidrToLongMask,
  cidrToMask,
  toBinaryString,
} = require('../content-site/tools/subnet-calculator/script.js');

describe('Subnet Calculator (/tools/subnet-calculator/)', () => {
  describe('validateIp', () => {
    test('accepts valid IPv4 addresses', () => {
      expect(validateIp('192.168.1.1')).toBe(true);
      expect(validateIp('0.0.0.0')).toBe(true);
      expect(validateIp('255.255.255.255')).toBe(true);
      expect(validateIp('10.20.30.40')).toBe(true);
    });

    test('rejects invalid IPv4 addresses', () => {
      expect(validateIp('')).toBe(false);
      expect(validateIp('256.1.1.1')).toBe(false);
      expect(validateIp('192.168.1')).toBe(false);
      expect(validateIp('192.168.1.1.1')).toBe(false);
      expect(validateIp('192.168.1.-1')).toBe(false);
      expect(validateIp('192.168.1.abc')).toBe(false);
      expect(validateIp(null)).toBe(false);
    });
  });

  describe('binary and mask conversion helpers', () => {
    test('converts IP to 32-bit unsigned integer and back', () => {
      const ip = '192.168.1.1';
      const num = ipToLong(ip);
      expect(num).toBe(3232235777);
      expect(longToIp(num)).toBe(ip);
    });

    test('converts CIDR to dotted-decimal mask', () => {
      expect(cidrToMask(24)).toBe('255.255.255.0');
      expect(cidrToMask(26)).toBe('255.255.255.192');
      expect(cidrToMask(30)).toBe('255.255.255.252');
      expect(cidrToMask(31)).toBe('255.255.255.254');
      expect(cidrToMask(32)).toBe('255.255.255.255');
      expect(cidrToLongMask(0)).toBe(0);
    });

    test('formats 32-bit integer as dotted binary octets', () => {
      expect(toBinaryString(ipToLong('192.168.1.1'))).toBe('11000000.10101000.00000001.00000001');
      expect(toBinaryString(cidrToLongMask(24))).toBe('11111111.11111111.11111111.00000000');
    });
  });

  describe('computeSubnet standard prefixes (/24, /26, /30)', () => {
    test('computes /24 subnet accurately', () => {
      const res = computeSubnet('192.168.1.42', 24);
      expect(res).toEqual({
        valid: true,
        subnetMask: '255.255.255.0',
        networkAddress: '192.168.1.0',
        usableRange: '192.168.1.1 - 192.168.1.254',
        broadcastAddress: '192.168.1.255',
        usableHosts: 254,
        wildcardMask: '0.0.0.255',
        binIp: '11000000.10101000.00000001.00101010',
        binMask: '11111111.11111111.11111111.00000000',
        binNet: '11000000.10101000.00000001.00000000',
        binBroad: '11000000.10101000.00000001.11111111',
      });
    });

    test('computes /26 subnet accurately', () => {
      const res = computeSubnet('10.0.0.130', 26);
      expect(res.valid).toBe(true);
      expect(res.subnetMask).toBe('255.255.255.192');
      expect(res.networkAddress).toBe('10.0.0.128');
      expect(res.usableRange).toBe('10.0.0.129 - 10.0.0.190');
      expect(res.broadcastAddress).toBe('10.0.0.191');
      expect(res.usableHosts).toBe(62);
      expect(res.wildcardMask).toBe('0.0.0.63');
    });

    test('computes /30 subnet accurately', () => {
      const res = computeSubnet('172.16.0.5', 30);
      expect(res.valid).toBe(true);
      expect(res.subnetMask).toBe('255.255.255.252');
      expect(res.networkAddress).toBe('172.16.0.4');
      expect(res.usableRange).toBe('172.16.0.5 - 172.16.0.6');
      expect(res.broadcastAddress).toBe('172.16.0.7');
      expect(res.usableHosts).toBe(2);
      expect(res.wildcardMask).toBe('0.0.0.3');
    });
  });

  describe('computeSubnet RFC 3021 /31 and /32 special prefixes', () => {
    test('computes RFC 3021 /31 point-to-point link with 2 usable hosts and no network/broadcast', () => {
      const res = computeSubnet('10.0.0.19', 31);
      expect(res).toEqual({
        valid: true,
        subnetMask: '255.255.255.254',
        networkAddress: 'None (RFC 3021 /31)',
        usableRange: '10.0.0.18 - 10.0.0.19',
        broadcastAddress: 'None (RFC 3021 /31)',
        usableHosts: 2,
        wildcardMask: '0.0.0.1',
        binIp: '00001010.00000000.00000000.00010011',
        binMask: '11111111.11111111.11111111.11111110',
        binNet: '00001010.00000000.00000000.00010010 (Host 0, RFC 3021)',
        binBroad: '00001010.00000000.00000000.00010011 (Host 1, RFC 3021)',
      });
    });

    test('computes /32 single-host route with 1 usable host and no network/broadcast', () => {
      const res = computeSubnet('192.168.10.99', 32);
      expect(res).toEqual({
        valid: true,
        subnetMask: '255.255.255.255',
        networkAddress: 'None (/32 single host)',
        usableRange: '192.168.10.99',
        broadcastAddress: 'None (/32 single host)',
        usableHosts: 1,
        wildcardMask: '0.0.0.0',
        binIp: '11000000.10101000.00001010.01100011',
        binMask: '11111111.11111111.11111111.11111111',
        binNet: 'N/A (/32 single host)',
        binBroad: 'N/A (/32 single host)',
      });
    });

    test('returns { valid: false } for invalid IP or CIDR', () => {
      expect(computeSubnet('999.999.999.999', 24)).toEqual({ valid: false });
      expect(computeSubnet('192.168.1.1', 33)).toEqual({ valid: false });
      expect(computeSubnet('192.168.1.1', -1)).toEqual({ valid: false });
    });
  });
});

describe('Cross-Tool Handoff Chains & Thin Tool Enrichments', () => {
  const fs = require('fs');
  const path = require('path');
  const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  test('tool-handoff.js includes all new SOURCE_LABELS', () => {
    const handoffJs = read('content-site/tools/shared/tool-handoff.js');
    [
      'ai-unemployment-hearing-prep-coach',
      'ai-unemployment-appeal-letter',
      'behavioral-log',
      'med-administration-log',
      'caregiver-report',
      'ai-rental-application-companion',
      'ai-irs-tax-debt-case-companion',
      'medical-debt-dispute',
    ].forEach(slug => {
      expect(handoffJs).toContain(`'/tools/${slug}/':`);
    });
  });

  test('wires all 4 cross-tool handoff chains in source and target tools', () => {
    // Chain 1: unemployment hearing prep coach <-> unemployment appeal letter + appeal-letter
    const hearingCoach = read('content-site/tools/ai-unemployment-hearing-prep-coach/index.html');
    const unempAppeal = read('content-site/tools/ai-unemployment-appeal-letter/index.html');
    expect(hearingCoach).toContain("slug: 'ai-unemployment-appeal-letter'");
    expect(hearingCoach).toContain("slug: 'appeal-letter'");
    expect(hearingCoach).toContain('receiveHandoff');
    expect(unempAppeal).toContain("slug: 'ai-unemployment-hearing-prep-coach'");
    expect(unempAppeal).toContain('receiveHandoff');

    // Chain 2: behavioral-log & med-administration-log -> caregiver-report -> soap-note-generator
    const behLog = read('content-site/tools/behavioral-log/index.html');
    const medLog = read('content-site/tools/med-administration-log/index.html');
    const caregiver = read('content-site/tools/caregiver-report/index.html');
    const soap = read('content-site/tools/soap-note-generator/index.html');
    expect(behLog).toContain("slug: 'caregiver-report'");
    expect(medLog).toContain("slug: 'caregiver-report'");
    expect(caregiver).toContain('receiveHandoff');
    expect(caregiver).toContain("slug: 'soap-note-generator'");
    expect(soap).toContain('receiveHandoff');

    // Chain 3: rental application companion -> rental-application-letter-writer, tenant companion -> eviction & rent increase
    const rentalComp = read('content-site/tools/ai-rental-application-companion/index.html');
    const rentalWriter = read('content-site/tools/rental-application-letter-writer/index.html');
    const tenantComp = read('content-site/tools/ai-tenant-case-companion/index.html');
    const evictionResp = read('content-site/tools/ai-eviction-notice-response-letter/index.html');
    const rentInc = read('content-site/tools/ai-rent-increase-negotiation-letter/index.html');
    expect(rentalComp).toContain("slug: 'rental-application-letter-writer'");
    expect(rentalWriter).toContain('receiveHandoff');
    expect(tenantComp).toContain("slug: 'ai-eviction-notice-response-letter'");
    expect(tenantComp).toContain("slug: 'ai-rent-increase-negotiation-letter'");
    expect(evictionResp).toContain('receiveHandoff');
    expect(rentInc).toContain('receiveHandoff');

    // Chain 4: IRS tax debt companion -> installment & OIC, medical-debt-dispute -> hardship & insurance appeal, paper-trail -> payment-demand-letter
    const irsComp = read('content-site/tools/ai-irs-tax-debt-case-companion/index.html');
    const irsInstall = read('content-site/tools/ai-irs-installment-agreement-letter/index.html');
    const irsOic = read('content-site/tools/ai-irs-offer-in-compromise-letter/index.html');
    const medDispute = read('content-site/tools/medical-debt-dispute/index.html');
    const paperTrail = read('content-site/tools/paper-trail/index.html');
    const paymentDemand = read('content-site/tools/payment-demand-letter/index.html');
    expect(irsComp).toContain("slug: 'ai-irs-installment-agreement-letter'");
    expect(irsComp).toContain("slug: 'ai-irs-offer-in-compromise-letter'");
    expect(irsInstall).toContain('receiveHandoff');
    expect(irsOic).toContain('receiveHandoff');
    expect(medDispute).toContain("slug: 'hardship-letter'");
    expect(medDispute).toContain("slug: 'insurance-denial-appeal'");
    expect(paperTrail).toContain("slug: 'payment-demand-letter'");
    expect(paymentDemand).toContain('receiveHandoff');
  });

  test('enriches sap-appeal-letter, utility-shutoff-letter, and removes Pro unlimited eyebrow', () => {
    const sap = read('content-site/tools/sap-appeal-letter/index.html');
    const util = read('content-site/tools/utility-shutoff-letter/index.html');
    const ins = read('content-site/tools/insurance-denial-appeal/index.html');
    expect(sap).not.toContain('Pro unlimited');
    expect(util).not.toContain('Pro unlimited');
    expect(ins).not.toContain('Pro unlimited');
    expect(sap).toContain('Real ways students use a SAP appeal letter');
    expect(util).toContain('Real ways people use a utility shutoff letter');
    expect((sap.match(/<details class="lt-faq-item">/g) || []).length).toBe(8);
    expect((util.match(/<details class="lt-faq-item">/g) || []).length).toBe(8);
  });
});

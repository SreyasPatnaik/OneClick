import dns from 'node:dns/promises';
import net from 'node:net';

export class SSRFSecurityError extends Error {
  code = 'SSRF_ATTEMPT_BLOCKED' as const;
  constructor(message: string) {
    super(message);
    this.name = 'SSRFSecurityError';
  }
}

/**
 * Checks if an IPv4 address is in private, loopback, link-local, or reserved ranges.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // malformed, treat as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local & Cloud Metadata, e.g., 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is private, loopback, link-local, or unique local.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback (::1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // Unspecified (::)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4 = normalized.slice(7);
    if (net.isIPv4(ipv4)) {
      return isPrivateIPv4(ipv4);
    }
  }

  // Unique Local Address fc00::/7 (fc00:: to fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-local unicast fe80::/10 (fe80:: to febf::)
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  return false;
}

const BLOCKED_HOST_PATTERNS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'metadata.google.internal',
  'instance-data',
  '.internal',
  '.local',
];

/**
 * Validates a target URL against SSRF attacks.
 * Resolves DNS and ensures that all IPs point to safe, public internet addresses.
 */
export async function assertSafeUrlForFetch(targetUrl: string): Promise<URL> {
  const parsed = new URL(targetUrl);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SSRFSecurityError(`Forbidden URL protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  for (const blocked of BLOCKED_HOST_PATTERNS) {
    if (hostname === blocked || hostname.endsWith(blocked)) {
      throw new SSRFSecurityError(`Target host is restricted: ${hostname}`);
    }
  }

  // If hostname is directly an IP
  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname) && isPrivateIPv4(hostname)) {
      throw new SSRFSecurityError('Access to private IPv4 address blocked');
    }
    if (net.isIPv6(hostname) && isPrivateIPv6(hostname)) {
      throw new SSRFSecurityError('Access to private IPv6 address blocked');
    }
    return parsed;
  }

  // Resolve DNS to verify all destination IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new SSRFSecurityError(`Could not resolve hostname: ${hostname}`);
    }

    for (const addr of addresses) {
      if (addr.family === 4 && isPrivateIPv4(addr.address)) {
        throw new SSRFSecurityError(
          `Resolved hostname ${hostname} points to private IP: ${addr.address}`
        );
      }
      if (addr.family === 6 && isPrivateIPv6(addr.address)) {
        throw new SSRFSecurityError(
          `Resolved hostname ${hostname} points to private IPv6: ${addr.address}`
        );
      }
    }
  } catch (err) {
    if (err instanceof SSRFSecurityError) throw err;
    throw new SSRFSecurityError(`DNS resolution failed for host: ${hostname}`);
  }

  return parsed;
}

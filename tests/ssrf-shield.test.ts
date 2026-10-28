import { describe, it, expect } from './test-framework.ts';
import {
  isPrivateIPv4,
  isPrivateIPv6,
  assertSafeUrlForFetch,
  SSRFSecurityError,
} from '../apps/api/dist/ssrf-shield.js';

describe('SSRF Shield & Private IP Filter', () => {
  it('correctly identifies private, loopback, and link-local IPv4 addresses', () => {
    expect(isPrivateIPv4('127.0.0.1')).toBe(true);
    expect(isPrivateIPv4('127.0.0.5')).toBe(true);
    expect(isPrivateIPv4('10.0.0.1')).toBe(true);
    expect(isPrivateIPv4('10.255.255.255')).toBe(true);
    expect(isPrivateIPv4('172.16.0.1')).toBe(true);
    expect(isPrivateIPv4('172.31.255.255')).toBe(true);
    expect(isPrivateIPv4('192.168.1.1')).toBe(true);
    expect(isPrivateIPv4('192.168.0.254')).toBe(true);
    expect(isPrivateIPv4('169.254.169.254')).toBe(true); // AWS / GCP metadata
    expect(isPrivateIPv4('0.0.0.0')).toBe(true);
  });

  it('allows public IPv4 addresses', () => {
    expect(isPrivateIPv4('8.8.8.8')).toBe(false);
    expect(isPrivateIPv4('1.1.1.1')).toBe(false);
    expect(isPrivateIPv4('142.250.190.46')).toBe(false);
  });

  it('correctly identifies private and loopback IPv6 addresses', () => {
    expect(isPrivateIPv6('::1')).toBe(true);
    expect(isPrivateIPv6('fe80::1')).toBe(true);
    expect(isPrivateIPv6('fc00::1')).toBe(true);
  });

  it('blocks dangerous URLs targeting loopback or internal metadata', async () => {
    await expect(assertSafeUrlForFetch('http://127.0.0.1:4000/')).rejects.toThrow(
      SSRFSecurityError
    );
    await expect(assertSafeUrlForFetch('http://localhost:3000/')).rejects.toThrow(
      SSRFSecurityError
    );
    await expect(
      assertSafeUrlForFetch('http://169.254.169.254/latest/meta-data/')
    ).rejects.toThrow(SSRFSecurityError);
    await expect(
      assertSafeUrlForFetch('http://metadata.google.internal/computeMetadata/v1/')
    ).rejects.toThrow(SSRFSecurityError);
  });
});

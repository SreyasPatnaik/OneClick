import { describe, it, expect } from './test-framework.ts';
import {
  isValidHttpUrl,
  matchesDomain,
  detectPlatform,
  inspectUrlLocally,
  LinkInspectionRequestSchema,
} from '../packages/shared/dist/index.js';

describe('URL Validation & Security Filtering', () => {
  it('accepts valid https URLs', () => {
    expect(isValidHttpUrl('https://example.com/video.mp4')).toBe(true);
    expect(isValidHttpUrl('https://www.youtube.com/watch?v=123')).toBe(true);
  });

  it('accepts valid http URLs', () => {
    expect(isValidHttpUrl('http://example.com/stream.webm')).toBe(true);
  });

  it('rejects unsupported schemes like javascript:, file:, data:', () => {
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrl('file:///C:/Windows/System32')).toBe(false);
    expect(isValidHttpUrl('data:text/html,<script>evil()</script>')).toBe(false);
    expect(isValidHttpUrl('ftp://ftp.example.com/file')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isValidHttpUrl('not-a-url')).toBe(false);
    expect(isValidHttpUrl('')).toBe(false);
    expect(isValidHttpUrl('http://')).toBe(false);
  });

  it('validates strictly with Zod LinkInspectionRequestSchema', () => {
    const valid = LinkInspectionRequestSchema.safeParse({ url: 'https://example.com/test.mp4' });
    expect(valid.success).toBe(true);

    const invalidScheme = LinkInspectionRequestSchema.safeParse({ url: 'javascript:void(0)' });
    expect(invalidScheme.success).toBe(false);

    const empty = LinkInspectionRequestSchema.safeParse({ url: '' });
    expect(empty.success).toBe(false);
  });
});

describe('Hostname Parsing & Lookalike Domain Defense', () => {
  it('matches legitimate subdomains correctly', () => {
    expect(matchesDomain('m.youtube.com', 'youtube.com')).toBe(true);
    expect(matchesDomain('youtube.com', 'youtube.com')).toBe(true);
    expect(matchesDomain('www.instagram.com', 'instagram.com')).toBe(true);
  });

  it('rejects attacker lookalike domains', () => {
    // Lookalike suffix attack: youtube.com.attacker.com
    expect(matchesDomain('youtube.com.attacker.com', 'youtube.com')).toBe(false);
    // Lookalike prefix attack: fakeyoutube.com
    expect(matchesDomain('fakeyoutube.com', 'youtube.com')).toBe(false);
    // Typo squatting: youtuber.com
    expect(matchesDomain('youtuber.com', 'youtube.com')).toBe(false);
  });
});

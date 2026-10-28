import { describe, it, expect } from './test-framework.ts';
import {
  detectPlatform,
  inspectUrlLocally,
} from '../packages/shared/dist/index.js';

describe('Platform Classification & Honest Result States', () => {
  it('correctly classifies YouTube links and never generates unofficial stream extraction', () => {
    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    ];

    for (const u of urls) {
      const detected = detectPlatform(u);
      expect(detected.platform).toBe('youtube');

      const result = inspectUrlLocally(u);
      expect(result.status).toBe('official_action_available');
      expect(result.availableActions).toContain('open_official');
      expect(result.availableActions).not.toContain('download');
      expect(result.directMediaUrl).toBeUndefined();
      expect(result.message).toContain('YouTube content protections');
    }
  });

  it('honestly classifies Instagram and Facebook links without fabricating downloadable files', () => {
    const igResult = inspectUrlLocally('https://www.instagram.com/reel/Cx12345/');
    expect(igResult.platform).toBe('instagram');
    expect(igResult.status).toBe('official_action_available');
    expect(igResult.availableActions).not.toContain('download');
    expect(igResult.directMediaUrl).toBeUndefined();

    const fbResult = inspectUrlLocally('https://www.facebook.com/watch/?v=123456');
    expect(fbResult.platform).toBe('facebook');
    expect(fbResult.status).toBe('official_action_available');
    expect(fbResult.availableActions).not.toContain('download');
  });

  it('detects direct media files and marks direct_download_available', () => {
    const directUrl = 'https://example.com/assets/sample_video.mp4';
    const result = inspectUrlLocally(directUrl);

    expect(result.platform).toBe('direct_media');
    expect(result.status).toBe('direct_download_available');
    expect(result.availableActions).toContain('download');
    expect(result.directMediaUrl).toBe(directUrl);
    expect(result.title).toBe('sample_video.mp4');
  });

  it('marks regular websites as unsupported without false promises', () => {
    const webResult = inspectUrlLocally('https://news.ycombinator.com/');
    expect(webResult.platform).toBe('website');
    expect(webResult.status).toBe('unsupported');
    expect(webResult.availableActions).not.toContain('download');
    expect(webResult.message).toContain('links to a web page');
  });

  it('flags invalid link schemes cleanly', () => {
    const result = inspectUrlLocally('javascript:alert(1)');
    expect(result.status).toBe('invalid_link');
    expect(result.availableActions).toHaveLength(0);
  });
});

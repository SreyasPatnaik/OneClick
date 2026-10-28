import {
  LinkInspectionResult,
  inspectUrlLocally,
  extractFilenameFromUrl,
} from '@clipnest/shared';
import { assertSafeUrlForFetch, SSRFSecurityError } from './ssrf-shield.js';
import { extractMediaMetadata } from './extractor.js';

const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Build the download stream URL dynamically.
 * The caller (browser) will resolve it via window.location.hostname,
 * but on the server side we use a relative-style URL that the frontend
 * will prepend the correct host to. We embed the API path so the
 * frontend can use it directly.
 */
function buildDownloadUrl(targetUrl: string, title: string, reqHost?: string): string {
  // Use the request host if available, otherwise fallback
  const host = reqHost || '127.0.0.1';
  return `http://${host}:4000/api/v1/download/stream?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(title)}`;
}

export async function inspectUrl(targetUrl: string, reqHost?: string): Promise<LinkInspectionResult> {
  // First run local heuristics & platform rules
  const localResult = inspectUrlLocally(targetUrl);

  // If link is malformed or invalid scheme, reject immediately
  if (localResult.status === 'invalid_link') {
    return localResult;
  }

  // Defend against SSRF before making any network probe or extraction
  await assertSafeUrlForFetch(targetUrl);

  // ── STRATEGY: Always try yt-dlp extraction for EVERY valid link ──
  // yt-dlp supports 1700+ sites natively AND has a generic extractor
  // that scrapes <video>, <audio>, og:video tags from any webpage.
  try {
    const extracted = await extractMediaMetadata(targetUrl);
    if (extracted) {
      return {
        url: targetUrl,
        platform: localResult.platform,
        status: 'direct_download_available',
        displayHost: localResult.displayHost,
        title: extracted.title,
        mediaType: `video/${extracted.ext}`,
        sizeBytes: extracted.filesize || null,
        availableActions: ['download', 'copy_url', 'open_official'],
        message: `Extracted ${extracted.resolution || 'media'} stream ready for download.`,
        directMediaUrl: buildDownloadUrl(extracted.directUrl || targetUrl, extracted.title, reqHost),
        inspectionTimestamp: new Date().toISOString(),
      };
    }
  } catch (extractErr) {
    console.warn('[Inspector] Extraction attempt failed, trying fallback methods:', extractErr);
  }

  // ── FALLBACK: Attempt safe HTTP HEAD inspection for direct media files ──
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let headResponse: globalThis.Response | null = null;
    try {
      headResponse = await fetch(targetUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ClipNest/1.0',
          Accept: '*/*',
        },
      });
    } catch (headErr) {
      // Some media servers reject HEAD; attempt a 0-0 range GET with instant abort
      headResponse = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ClipNest/1.0',
          Range: 'bytes=0-0',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!headResponse) {
      return {
        ...localResult,
        status: 'temporarily_unavailable',
        message: 'Could not connect to the remote server.',
      };
    }

    const contentType = headResponse.headers.get('content-type') || '';
    const contentLength = headResponse.headers.get('content-length');
    const contentRange = headResponse.headers.get('content-range');

    let sizeBytes: number | null = null;
    if (contentLength && !isNaN(parseInt(contentLength, 10))) {
      sizeBytes = parseInt(contentLength, 10);
    } else if (contentRange) {
      const match = contentRange.match(/\/(\d+)/);
      if (match && match[1]) {
        sizeBytes = parseInt(match[1], 10);
      }
    }

    const isVideoOrAudio =
      contentType.startsWith('video/') ||
      contentType.startsWith('audio/') ||
      contentType.includes('application/octet-stream');

    if (headResponse.ok || headResponse.status === 206) {
      if (isVideoOrAudio || localResult.platform === 'direct_media') {
        const filename = extractFilenameFromUrl(targetUrl);
        return {
          url: targetUrl,
          platform: 'direct_media',
          status: 'direct_download_available',
          displayHost: localResult.displayHost,
          title: filename,
          mediaType: contentType || 'video/mp4',
          sizeBytes,
          availableActions: ['download', 'copy_url', 'open_source'],
          message: 'Verified direct media stream. Ready for download.',
          directMediaUrl: targetUrl,
          inspectionTimestamp: new Date().toISOString(),
        };
      }
    } else if (headResponse.status === 401 || headResponse.status === 403) {
      return {
        ...localResult,
        status: 'permission_required',
        message: 'Authentication or access permission is required to view this content.',
      };
    } else if (headResponse.status === 404) {
      return {
        ...localResult,
        status: 'invalid_link',
        message: 'The requested remote media file was not found (HTTP 404).',
      };
    }

    // Universal fallback for web pages: enable direct streaming download via API
    return {
      url: targetUrl,
      platform: localResult.platform,
      status: 'direct_download_available',
      displayHost: localResult.displayHost,
      title: localResult.title || localResult.displayHost,
      mediaType: 'video/mp4',
      sizeBytes: sizeBytes,
      availableActions: ['download', 'copy_url', 'open_official'],
      message: 'Universal media stream capture ready. Click to download.',
      directMediaUrl: buildDownloadUrl(targetUrl, localResult.title || localResult.displayHost, reqHost),
      inspectionTimestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        ...localResult,
        status: 'temporarily_unavailable',
        message: 'Connection timed out while probing target server.',
      };
    }
    return localResult;
  }
}

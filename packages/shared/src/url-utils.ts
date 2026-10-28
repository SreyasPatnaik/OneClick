import { PlatformType, LinkInspectionResult, LinkStatus, AvailableAction } from './types.js';
import { PLATFORM_CONFIGS } from './platforms.js';

export const DIRECT_MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.mkv',
  '.mov',
  '.m4v',
  '.mp3',
  '.ogg',
  '.wav',
  '.flac',
  '.aac',
]);

export function isValidHttpUrl(inputUrl: string): boolean {
  try {
    const parsed = new URL(inputUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeFilename(filename: string): string {
  // Strip dangerous path traversal characters and invalid characters
  return filename
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'media_file';
}

export function extractFilenameFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
      const decoded = decodeURIComponent(last);
      return sanitizeFilename(decoded);
    }
  } catch {
    // fallback
  }
  return 'clipnest_media.mp4';
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function matchesDomain(hostname: string, domainPattern: string): boolean {
  const host = hostname.toLowerCase();
  const pattern = domainPattern.toLowerCase();
  if (host === pattern) return true;
  if (host.endsWith('.' + pattern)) return true;
  return false;
}

export function detectPlatform(urlStr: string): {
  platform: PlatformType;
  displayHost: string;
} {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname;

    for (const [key, config] of Object.entries(PLATFORM_CONFIGS)) {
      for (const domain of config.matchedDomains) {
        if (matchesDomain(hostname, domain)) {
          return { platform: config.id, displayHost: hostname };
        }
      }
    }

    // Check if path or query indicates direct media
    if (hasDirectMediaExtension(parsed.pathname)) {
      return { platform: 'direct_media', displayHost: hostname };
    }

    return { platform: 'website', displayHost: hostname };
  } catch {
    return { platform: 'unknown', displayHost: 'unknown' };
  }
}

export function hasDirectMediaExtension(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  for (const ext of DIRECT_MEDIA_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return true;
    }
  }
  return false;
}

export function inspectUrlLocally(urlStr: string): LinkInspectionResult {
  const timestamp = new Date().toISOString();

  if (!isValidHttpUrl(urlStr)) {
    return {
      url: urlStr,
      platform: 'unknown',
      status: 'invalid_link',
      displayHost: 'invalid',
      title: null,
      mediaType: null,
      sizeBytes: null,
      availableActions: [],
      message: 'The provided link is not a valid HTTP or HTTPS web address.',
      inspectionTimestamp: timestamp,
    };
  }

  const { platform, displayHost } = detectPlatform(urlStr);

  if (platform in PLATFORM_CONFIGS) {
    const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
    return {
      url: urlStr,
      platform,
      status: config.status,
      displayHost,
      title: `${config.name} Media Link`,
      mediaType: 'text/html',
      sizeBytes: null,
      availableActions: config.availableActions,
      message: config.guidance.explanation,
      officialGuidance: config.guidance,
      inspectionTimestamp: timestamp,
    };
  }

  if (platform === 'direct_media') {
    const filename = extractFilenameFromUrl(urlStr);
    return {
      url: urlStr,
      platform: 'direct_media',
      status: 'direct_download_available',
      displayHost,
      title: filename,
      mediaType: 'video/mp4',
      sizeBytes: null,
      availableActions: ['download', 'copy_url', 'open_source'],
      message: 'Direct media file detected. Ensure you have proper rights to save and retain this content.',
      directMediaUrl: urlStr,
      inspectionTimestamp: timestamp,
    };
  }

  // Generic website
  return {
    url: urlStr,
    platform: 'website',
    status: 'unsupported',
    displayHost,
    title: displayHost,
    mediaType: 'text/html',
    sizeBytes: null,
    availableActions: ['open_source', 'copy_url'],
    message:
      'This URL links to a web page. ClipNest only downloads direct authorized media files and does not scrape or bypass third-party site restrictions.',
    inspectionTimestamp: timestamp,
  };
}

import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Response } from 'express';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ExtractedMedia {
  id: string;
  title: string;
  uploader?: string;
  thumbnail?: string;
  duration?: number;
  resolution?: string;
  ext: string;
  directUrl?: string;
  filesize?: number;
  extractor: string;
}

export interface ExtractionResult {
  media: ExtractedMedia | null;
  requiresAuth?: boolean;
  errorMessage?: string;
}

/**
 * Locate yt-dlp binary path
 */
export function getYtDlpPath(): string | null {
  const candidatePaths = [
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    path.resolve(__dirname, '../bin/yt-dlp.exe'),
    path.resolve(__dirname, '../../desktop/bin/yt-dlp.exe'),
    path.resolve(process.cwd(), 'apps/api/bin/yt-dlp.exe'),
    path.resolve(process.cwd(), 'apps/desktop/bin/yt-dlp.exe'),
    path.resolve(__dirname, '../bin/yt-dlp'),
    path.resolve(process.cwd(), 'apps/api/bin/yt-dlp'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return 'yt-dlp';
}

let cachedFfmpegDir: string | null | undefined = undefined;

/**
 * Locate ffmpeg binary directory dynamically
 */
export function getFfmpegDir(): string | null {
  if (cachedFfmpegDir !== undefined) {
    return cachedFfmpegDir;
  }

  const candidateDirs = [
    '/usr/bin',
    '/usr/local/bin',
    path.resolve(__dirname, '../bin'),
    path.resolve(__dirname, '../../desktop/bin'),
    path.resolve(process.cwd(), 'apps/api/bin'),
    path.resolve(process.cwd(), 'apps/desktop/bin'),
  ];

  for (const dir of candidateDirs) {
    const ffmpegPath = path.join(dir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    if (fs.existsSync(ffmpegPath)) {
      cachedFfmpegDir = dir;
      return dir;
    }
  }

  // Probe system PATH via where.exe / which
  try {
    const cmd = process.platform === 'win32' ? 'where.exe ffmpeg' : 'which ffmpeg';
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 }).trim();
    const firstLine = output.split(/\r?\n/)[0]?.trim();
    if (firstLine && fs.existsSync(firstLine)) {
      const dir = path.dirname(firstLine);
      cachedFfmpegDir = dir;
      return dir;
    }
  } catch {}

  // Check common Windows WinGet / Chocolatey / Scoop installation locations
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    if (localAppData) {
      const wingetDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
      if (fs.existsSync(wingetDir)) {
        try {
          const pkgs = fs.readdirSync(wingetDir).filter((d) => d.toLowerCase().includes('ffmpeg'));
          for (const pkg of pkgs) {
            const pkgPath = path.join(wingetDir, pkg);
            const subdirs = fs.readdirSync(pkgPath);
            for (const sub of subdirs) {
              const binPath = path.join(pkgPath, sub, 'bin');
              if (fs.existsSync(path.join(binPath, 'ffmpeg.exe'))) {
                cachedFfmpegDir = binPath;
                return binPath;
              }
            }
          }
        } catch {}
      }
    }
  }

  cachedFfmpegDir = null;
  return null;
}

/**
 * Locate cookies.txt if available
 */
export function getCookiesPath(): string | null {
  const candidatePaths = [
    process.env.COOKIES_PATH,
    path.resolve(process.cwd(), 'cookies.txt'),
    path.resolve(process.cwd(), 'apps/api/cookies.txt'),
    path.resolve(process.cwd(), 'apps/desktop/cookies.txt'),
    path.resolve(__dirname, '../cookies.txt'),
    path.resolve(__dirname, '../../cookies.txt'),
    path.join(os.homedir(), '.clipnest', 'cookies.txt'),
    path.join(os.homedir(), 'Downloads', 'cookies.txt'),
  ].filter(Boolean) as string[];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isFile() && stat.size > 0) {
          return p;
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Detect which browsers are available on the system for cookie extraction.
 * Returns an array of browser names that yt-dlp accepts (e.g. ['chrome', 'edge', 'brave', 'firefox', ...]).
 */
function detectAvailableBrowsers(): string[] {
  const detected = new Set<string>();

  // 1. Check PATH via where.exe / which
  const browserBinaries: { name: string; checks: string[] }[] = [
    { name: 'chrome', checks: ['chrome', 'chrome.exe', 'google-chrome'] },
    { name: 'edge', checks: ['msedge', 'msedge.exe'] },
    { name: 'brave', checks: ['brave', 'brave.exe'] },
    { name: 'firefox', checks: ['firefox', 'firefox.exe'] },
    { name: 'opera', checks: ['opera', 'opera.exe'] },
  ];

  for (const b of browserBinaries) {
    for (const bin of b.checks) {
      try {
        const cmd = process.platform === 'win32' ? `where.exe ${bin}` : `which ${bin}`;
        execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 });
        detected.add(b.name);
        break;
      } catch {}
    }
  }

  // 2. Check standard Windows installation directories
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    // Chrome paths
    const chromePaths = [
      path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(progFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
    for (const p of chromePaths) {
      if (fs.existsSync(p)) {
        detected.add('chrome');
        break;
      }
    }

    // Edge paths
    const edgePaths = [
      path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(progFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ];
    for (const p of edgePaths) {
      if (fs.existsSync(p)) {
        detected.add('edge');
        break;
      }
    }

    // Brave paths
    const bravePaths = [
      path.join(progFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    ];
    for (const p of bravePaths) {
      if (fs.existsSync(p)) {
        detected.add('brave');
        break;
      }
    }

    // Firefox paths
    const firefoxPaths = [
      path.join(progFiles, 'Mozilla Firefox', 'firefox.exe'),
      path.join(progFilesX86, 'Mozilla Firefox', 'firefox.exe'),
    ];
    for (const p of firefoxPaths) {
      if (fs.existsSync(p)) {
        detected.add('firefox');
        break;
      }
    }
  }

  // Prioritize Chrome and Edge first, then other browsers
  const priorityOrder = ['chrome', 'edge', 'brave', 'firefox', 'opera'];
  const result: string[] = [];
  for (const name of priorityOrder) {
    if (detected.has(name)) {
      result.push(name);
    }
  }
  for (const name of detected) {
    if (!result.includes(name)) {
      result.push(name);
    }
  }

  console.log('[Extractor] Available browsers for cookies:', result);
  return result;
}

let cachedBrowsers: string[] | undefined = undefined;

/**
 * Get all detected browsers on the system (cached after first call)
 */
export function getAvailableBrowsers(): string[] {
  if (cachedBrowsers !== undefined) return cachedBrowsers;
  cachedBrowsers = detectAvailableBrowsers();
  return cachedBrowsers;
}

/**
 * Get primary detected browser (cached after first call)
 */
export function getAvailableBrowser(): string | null {
  const browsers = getAvailableBrowsers();
  return browsers[0] || null;
}

/**
 * Extract rich metadata and direct stream info from any URL.
 */
export async function extractMediaMetadata(url: string): Promise<ExtractionResult> {
  // Strategy 1: Try native yt-dlp (with cookies.txt if available)
  const result = await runYtDlpExtraction(url, false);
  if (result.media) return result;

  // Strategy 1b: If auth required and no cookies.txt, auto-try browser cookies (Chrome, Edge, etc.)
  if (result.requiresAuth && !getCookiesPath()) {
    const browsers = getAvailableBrowsers();
    for (const browser of browsers) {
      console.log(`[Extractor] Auth required, auto-trying --cookies-from-browser ${browser}`);
      const browserResult = await runYtDlpExtraction(url, false, browser);
      if (browserResult.media) {
        return browserResult;
      }
    }
    return result;
  }

  // If failed due to authentication/login required (with cookies.txt present), return immediately
  if (result.requiresAuth) {
    return result;
  }

  // Strategy 2: For unknown sites, retry with generic extractor
  const isKnownPlatform = /youtube\.com|youtu\.be|instagram\.com|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.watch|reddit\.com|vimeo\.com/i.test(url);
  if (!isKnownPlatform) {
    console.log('[Extractor] Retrying with generic extractor for:', url);
    const genericResult = await runYtDlpExtraction(url, true);
    if (genericResult.media) return genericResult;

    // Strategy 3: HTML media inspection (for generic web pages)
    console.log('[Extractor] Attempting direct HTML media scraping for:', url);
    const scraped = await scrapeHtmlMedia(url);
    if (scraped) {
      return { media: scraped };
    }
  }

  return result;
}

/**
 * Direct HTML media scraper: looks for real video/audio streams
 */
async function scrapeHtmlMedia(url: string): Promise<ExtractedMedia | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();
    const unescapedHtml = html.replace(/\\\//g, '/');

    // Extract title
    let title = '';
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1].trim();
    } else if (titleTagMatch && titleTagMatch[1]) {
      title = titleTagMatch[1].trim();
    }
    title = title
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .trim();

    if (!title || /^(login|sign in|welcome to instagram|log in)/i.test(title)) {
      return null;
    }

    const isAdOrPromoUrl = (u: string) => {
      if (/ft_assets|ft_video|fm_ft_video|free_trial|_promo|_ad\b|\/ads\/|advertisement|banner_video|trailer_video|coin_pack|special_offer/i.test(u)) {
        return true;
      }
      return false;
    };

    const mediaCandidates: { url: string; isVideo: boolean; priority: number }[] = [];

    const addCandidate = (rawUrl: string | undefined, defaultIsVideo: boolean, basePriority: number) => {
      if (!rawUrl) return;
      let target = rawUrl.trim();
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        try {
          target = new URL(target, url).toString();
        } catch {
          return;
        }
      }
      if (!/\.(?:m3u8|mp4|webm|mp3|m4a|aac)(?:\?|$)/i.test(target)) return;

      const isAd = isAdOrPromoUrl(target);
      const isVideo = defaultIsVideo || /\.(?:mp4|webm)(?:\?|$)/i.test(target);

      let score = basePriority;
      if (isAd) {
        score -= 500;
      }

      mediaCandidates.push({ url: target, isVideo, priority: score });
    };

    const ogVideoMatch = html.match(/<meta\s+property=["']og:video(?::secure_url)?["']\s+content=["']([^"']+)["']/i);
    const ogAudioMatch = html.match(/<meta\s+property=["']og:audio(?::secure_url)?["']\s+content=["']([^"']+)["']/i);
    const videoSrcMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i);
    const audioSrcMatch = html.match(/<audio[^>]+src=["']([^"']+)["']/i);
    const sourceSrcMatch = html.match(/<source[^>]+src=["']([^"']+)["']/i);

    addCandidate(ogVideoMatch?.[1], true, 30);
    addCandidate(videoSrcMatch?.[1], true, 40);
    addCandidate(sourceSrcMatch?.[1], true, 35);
    addCandidate(ogAudioMatch?.[1], false, 20);
    addCandidate(audioSrcMatch?.[1], false, 20);

    const allStreamsRegex = /https?:\/\/[^"'\s<>]+\.(?:m3u8|mp4|webm|mp3|m4a|aac)(?:\?[^"'\s<>]*)?/gi;
    const allStreamMatches = unescapedHtml.match(allStreamsRegex) || [];
    for (const streamUrl of allStreamMatches) {
      addCandidate(streamUrl, !/\.(?:mp3|m4a|aac)(?:\?|$)/i.test(streamUrl), 20);
    }

    mediaCandidates.sort((a, b) => b.priority - a.priority);

    // CRITICAL FIX: If no media candidate was found, DO NOT fabricate a video result!
    if (mediaCandidates.length === 0) {
      return null;
    }

    const best = mediaCandidates[0];
    const mediaUrl = best.url;
    const ext = best.isVideo ? 'mp4' : 'mp3';

    if (!/\.(mp4|webm|mkv|mov|m4v|mp3|m4a)$/i.test(title)) {
      title = `${title}.${ext}`;
    }

    return {
      id: 'web_' + Date.now(),
      title,
      ext,
      directUrl: mediaUrl,
      extractor: 'html_media_scraper',
    };
  } catch (err) {
    console.warn('[Extractor] HTML scrape error:', err);
    return null;
  }
}

/**
 * Run yt-dlp extraction with optional generic extractor mode and browser cookie support
 */
function runYtDlpExtraction(url: string, useGeneric: boolean, browserCookies?: string): Promise<ExtractionResult> {
  const ytDlpPath = getYtDlpPath();
  if (!ytDlpPath) {
    console.warn('[Extractor] yt-dlp binary not found');
    return Promise.resolve({ media: null, errorMessage: 'Downloader binary not found' });
  }

  const ffmpegDir = getFfmpegDir();
  const cookiesPath = getCookiesPath();

  const args = [
    '--dump-single-json',
    '--no-warnings',
    '--no-playlist',
    '--playlist-items', '1',
    '--skip-download',
    '--no-check-certificates',
    '--extractor-args', 'youtube:player_client=android,ios,mweb,web',
    '--js-runtimes', 'node',
  ];

  if (browserCookies) {
    console.log(`[Extractor] Using browser cookies from: ${browserCookies}`);
    args.push('--cookies-from-browser', browserCookies);
  } else if (cookiesPath) {
    console.log('[Extractor] Using cookies from:', cookiesPath);
    args.push('--cookies', cookiesPath);
  }

  if (useGeneric) {
    args.push('--force-generic-extractor');
  }

  if (ffmpegDir) {
    args.push('--ffmpeg-location', ffmpegDir);
  }

  args.push(url);

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';

    const child = spawn(ytDlpPath, args, {
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      console.warn('[Extractor] Extraction timed out after 30s');
      resolve({ media: null, errorMessage: 'Extraction timed out after 30 seconds' });
    }, 30000);

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      console.error('[Extractor] Failed to spawn yt-dlp:', err);
      resolve({ media: null, errorMessage: err.message });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      const isAuthError =
        /login|log in|authentication|empty media response|confirm you're not a bot|confirm your age|private video|members-only/i.test(
          stderrData
        );

      let cleanError = '';
      const errorLines = stderrData
        .split('\n')
        .filter((l) => l.includes('ERROR:'))
        .map((l) => l.replace(/^ERROR:\s*/, '').trim());
      if (errorLines.length > 0) {
        cleanError = errorLines[0];
      }

      if (code !== 0 || !stdoutData.trim()) {
        resolve({
          media: null,
          requiresAuth: isAuthError,
          errorMessage: cleanError || stderrData.trim() || 'Extraction failed',
        });
        return;
      }

      try {
        const data = JSON.parse(stdoutData.trim());
        const bestFormat = Array.isArray(data.formats)
          ? data.formats.slice().reverse().find((f: any) => f.url && (f.vcodec !== 'none' || f.acodec !== 'none'))
          : null;

        let title = (data.title || '').trim();
        if (!title || title === data.id || /^[0-9a-f-]{20,}/i.test(title)) {
          const author = data.uploader || data.channel || 'creator';
          const descSnippet = data.description ? data.description.split('\n')[0].slice(0, 40).trim() : '';
          title = descSnippet || `${data.extractor || 'video'}_by_${author}`;
        }
        title = title.replace(/[/\\?%*:|"<>]/g, '_').trim();
        const ext = data.ext || bestFormat?.ext || 'mp4';
        if (!/\.(mp4|webm|mkv|mov|m4v|mp3|m4a)$/i.test(title)) {
          title = `${title}.${ext}`;
        }

        const extracted: ExtractedMedia = {
          id: data.id || 'media',
          title,
          uploader: data.uploader || data.channel || data.artist || undefined,
          thumbnail: data.thumbnail || undefined,
          duration: typeof data.duration === 'number' ? data.duration : undefined,
          resolution: data.resolution || (bestFormat ? `${bestFormat.width || 0}x${bestFormat.height || 0}` : undefined),
          ext,
          directUrl: bestFormat?.url || data.url || undefined,
          filesize: data.filesize || data.filesize_approx || bestFormat?.filesize || undefined,
          extractor: data.extractor || 'generic',
        };

        resolve({ media: extracted });
      } catch (parseErr) {
        console.error('[Extractor] Error parsing yt-dlp JSON:', parseErr);
        resolve({ media: null, errorMessage: 'Error parsing media stream data' });
      }
    });
  });
}

/**
 * Stream downloaded media directly to HTTP response.
 */
export function streamMediaDownload(url: string, filename: string, res: Response, compress = false) {
  const ytDlpPath = getYtDlpPath();
  if (!ytDlpPath) {
    res.status(500).json({ error: { code: 'EXTRACTOR_MISSING', message: 'Downloader engine not available' } });
    return;
  }

  const ffmpegDir = getFfmpegDir();
  const cookiesPath = getCookiesPath();
  const detectedBrowsers = getAvailableBrowsers();

  let safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_').trim();
  if (!/\.(mp4|webm|mkv|mov|m4v|mp3|m4a)$/i.test(safeFilename)) {
    safeFilename += '.mp4';
  }

  // Format selection: prioritize clean MP4 muxing with progressive fallback
  const formatSelection = compress
    ? 'bestvideo[height<=480]+bestaudio/bestvideo[width<=480]+bestaudio/best[height<=480]/best[width<=480]/best'
    : 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo+bestaudio/best';

  let currentUrl = url;
  const tempPrefix = `clipnest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempOutputFile = path.join(os.tmpdir(), `${tempPrefix}_%(title).70B.%(ext)s`);

  const buildArgs = (useGeneric: boolean, useBrowserCookies?: string) => {
    const args = [
      '-o', tempOutputFile,
      '-f', formatSelection,
      '--merge-output-format', 'mp4',
      '--concurrent-fragments', '4',
      '--no-warnings',
      '--no-playlist',
      '--playlist-items', '1',
      '--no-check-certificates',
      '--extractor-args', 'youtube:player_client=android,ios,mweb,web',
      '--js-runtimes', 'node',
    ];

    if (useBrowserCookies) {
      args.push('--cookies-from-browser', useBrowserCookies);
    } else if (cookiesPath) {
      args.push('--cookies', cookiesPath);
    }

    if (useGeneric) {
      args.push('--force-generic-extractor');
    }
    if (ffmpegDir) {
      args.push('--ffmpeg-location', ffmpegDir);
    }
    args.push(currentUrl);
    return args;
  };

  const cleanupTempFiles = () => {
    try {
      const files = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith(tempPrefix));
      for (const f of files) {
        fs.unlink(path.join(os.tmpdir(), f), () => {});
      }
    } catch {}
  };

  const attemptDownload = (useGeneric: boolean, browserIndex = -1) => {
    const currentBrowser = browserIndex >= 0 && browserIndex < detectedBrowsers.length ? detectedBrowsers[browserIndex] : undefined;
    const args = buildArgs(useGeneric, currentBrowser);
    const child = spawn(ytDlpPath, args, { windowsHide: true });
    let fullStderr = '';

    child.stderr.on('data', (data) => {
      const msg = data.toString();
      fullStderr += msg;
      console.error(`[Extractor Stream${useGeneric ? ' Generic' : ''}${currentBrowser ? ` Browser:${currentBrowser}` : ''}]`, msg.trim());
    });

    child.on('error', (err) => {
      console.error('[Extractor Stream] Spawn error:', err);
      if (!res.headersSent) {
        res.status(500).end('Failed to initialize download');
      }
      cleanupTempFiles();
    });

    child.on('close', (code) => {
      let actualFile: string | null = null;
      try {
        const matches = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith(tempPrefix) && !f.endsWith('.part'));
        if (matches.length > 0) {
          actualFile = path.join(os.tmpdir(), matches[0]);
        }
      } catch {}

      if (code !== 0 || !actualFile) {
        console.warn(`[Extractor Stream] yt-dlp exited with code ${code}${useGeneric ? ' (generic)' : ''}`);

        const isAuthRequired = /login|log in|authentication|empty media response|confirm you're not a bot|confirm your age|private video/i.test(
          fullStderr
        );

        // If auth required and no cookiesPath, try each available browser (Chrome, Edge, etc.)
        if (isAuthRequired && !cookiesPath && !res.headersSent) {
          const nextBrowserIndex = browserIndex + 1;
          if (nextBrowserIndex < detectedBrowsers.length) {
            const nextBrowser = detectedBrowsers[nextBrowserIndex];
            console.log(`[Extractor Stream] Auth required, auto-retrying with --cookies-from-browser ${nextBrowser} (${nextBrowserIndex + 1}/${detectedBrowsers.length})`);
            cleanupTempFiles();
            attemptDownload(useGeneric, nextBrowserIndex);
            return;
          }
        }

        if (isAuthRequired && !res.headersSent) {
          cleanupTempFiles();
          if (/instagram/i.test(currentUrl)) {
            res.status(401).end('Instagram authentication required. Instagram stories and protected content require login cookies. Please provide cookies in Settings or close your browser.');
          } else {
            res.status(401).end('Authentication required. This video requires login, cookies, or verification to access.');
          }
          return;
        }

        const isKnownPlatform = /youtube\.com|youtu\.be|instagram\.com|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.watch|reddit\.com|vimeo\.com/i.test(currentUrl);
        if (!useGeneric && !isKnownPlatform && !res.headersSent) {
          cleanupTempFiles();
          attemptDownload(true);
          return;
        }

        if (!res.headersSent) {
          const errorLine = fullStderr.split('\n').filter((l) => l.includes('ERROR:')).join(' ').trim();
          res.status(500).end(errorLine || 'Download failed — stream could not be extracted.');
          cleanupTempFiles();
          return;
        }
      }

      if (!actualFile || !fs.existsSync(actualFile)) {
        if (!res.headersSent) {
          res.status(500).end('Extracted file not found');
        }
        cleanupTempFiles();
        return;
      }

      // Stream the downloaded file to client
      const stat = fs.statSync(actualFile);
      const ext = path.extname(actualFile).toLowerCase();
      const isAudio = ext === '.mp3' || ext === '.m4a' || ext === '.aac';
      const outputExt = isAudio ? ext : '.mp4';
      const fileBase = path.basename(actualFile, path.extname(actualFile));
      const extractedTitle = fileBase.startsWith(tempPrefix) ? fileBase.slice(tempPrefix.length + 1) : '';
      const finalTitle = extractedTitle || safeFilename.replace(/\.[^.]+$/, '');
      const safeOutputName = `${finalTitle}${outputExt}`;
      const asciiName = safeOutputName.replace(/[^a-zA-Z0-9._-]/g, '_') || `video${outputExt}`;

      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeOutputName)}`);
      res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');

      const readStream = fs.createReadStream(actualFile);
      readStream.pipe(res);
      readStream.on('close', () => {
        cleanupTempFiles();
      });
      readStream.on('error', (err) => {
        console.error('Error reading downloaded file:', err);
        if (!res.headersSent) {
          res.status(500).end('Error streaming file');
        }
        cleanupTempFiles();
      });
    });

    res.on('close', () => {
      child.kill('SIGTERM');
      cleanupTempFiles();
    });
  };

  attemptDownload(false);
}

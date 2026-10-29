import { spawn } from 'node:child_process';
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

/**
 * Locate ffmpeg binary directory
 */
export function getFfmpegDir(): string | null {
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
      return dir;
    }
  }

  return null;
}

/**
 * Extract rich metadata and direct stream info from any URL.
 * Strategy:
 * 1. Try native yt-dlp (1700+ platforms)
 * 2. Retry with yt-dlp generic extractor
 * 3. Scrape webpage HTML for embedded video/audio/m3u8/mp4 streams (e.g. Kuku FM, Story TV, Chrome pages)
 * 4. Resilient fallback with webpage title so download stream can attempt capture
 */
export async function extractMediaMetadata(url: string): Promise<ExtractedMedia | null> {
  // Strategy 1: Try native yt-dlp
  const result = await runYtDlpExtraction(url, false);
  if (result) return result;

  // Strategy 2: Retry with force-generic-extractor for unknown sites
  console.log('[Extractor] Retrying with generic extractor for:', url);
  const genericResult = await runYtDlpExtraction(url, true);
  if (genericResult) return genericResult;

  // Strategy 3: HTML media inspection (for Kuku FM, Story TV, generic web pages)
  console.log('[Extractor] Attempting direct HTML media scraping for:', url);
  return scrapeHtmlMedia(url);
}

/**
 * Direct HTML media scraper: looks for <video>, <audio>, <source>, og:video, og:audio, and .m3u8/.mp4 links
 */
async function scrapeHtmlMedia(url: string): Promise<ExtractedMedia | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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
    // Clean HTML entities
    title = title
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .trim();

    if (!title) {
      try {
        title = new URL(url).hostname;
      } catch {
        title = 'Web Media';
      }
    }

    const isAdOrPromoUrl = (u: string) => {
      if (/ft_assets|ft_video|fm_ft_video|free_trial|_promo|_ad\b|\/ads\/|advertisement|banner_video|trailer_video|coin_pack|special_offer/i.test(u)) {
        return true;
      }
      const idx = unescapedHtml.indexOf(u);
      if (idx !== -1) {
        const surrounding = unescapedHtml.slice(Math.max(0, idx - 150), idx + 50);
        if (/marketingPageMetadata|coinPack|ftVideoUrl|ftVideoHlsUrl|adUrl|adVideoUrl|special_offer/i.test(surrounding)) {
          return true;
        }
      }
      return false;
    };

    // Collect all media stream candidates from HTML and JSON
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
      } else {
        if (/episode/i.test(target)) score += 50;
        if (target.includes('/audio/')) score += 40;
      }

      mediaCandidates.push({ url: target, isVideo, priority: score });
    };

    // 1. Direct Content Object in Kuku FM / React JSON (Highest Priority)
    const contentBlockRegex = /"content"\s*:\s*\{([^}]+)\}/g;
    let contentMatch;
    while ((contentMatch = contentBlockRegex.exec(unescapedHtml)) !== null) {
      const block = contentMatch[1];
      const urlMatch = block.match(/"(?:premiumAudioUrl|hlsUrl|audioUrl|videoUrl|url)"\s*:\s*"(https?:\/\/[^"\s]+\.(?:m3u8|mp4|mp3|m4a|aac)[^"\s]*)"/i);
      if (urlMatch && urlMatch[1]) {
        addCandidate(urlMatch[1], /video/i.test(urlMatch[0]), 300);
      }
    }

    // 2. Tag based
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

    // 3. Scan all embedded stream URLs in page
    const allStreamsRegex = /https?:\/\/[^"'\s<>]+\.(?:m3u8|mp4|webm|mp3|m4a|aac)(?:\?[^"'\s<>]*)?/gi;
    const allStreamMatches = unescapedHtml.match(allStreamsRegex) || [];
    for (const streamUrl of allStreamMatches) {
      addCandidate(streamUrl, !/\.(?:mp3|m4a|aac)(?:\?|$)/i.test(streamUrl), 20);
    }

    // Sort candidates by priority descending
    mediaCandidates.sort((a, b) => b.priority - a.priority);

    let mediaUrl: string | undefined;
    let ext = 'mp4';

    if (mediaCandidates.length > 0) {
      const best = mediaCandidates[0];
      mediaUrl = best.url;
      ext = best.isVideo ? 'mp4' : 'mp3';
      console.log(`[Extractor Scraper] Selected stream (priority ${best.priority}):`, mediaUrl);
    }

    if (!/\.(mp4|webm|mkv|mov|m4v|mp3|m4a)$/i.test(title)) {
      title = `${title}.${ext}`;
    }

    return {
      id: 'web_' + Date.now(),
      title,
      ext,
      directUrl: mediaUrl || url,
      extractor: mediaUrl ? 'html_media_scraper' : 'universal_web_extractor',
    };
  } catch (err) {
    console.warn('[Extractor] HTML scrape error:', err);
    return null;
  }
}

/**
 * Run yt-dlp extraction with optional generic extractor mode
 */
function runYtDlpExtraction(url: string, useGeneric: boolean): Promise<ExtractedMedia | null> {
  const ytDlpPath = getYtDlpPath();
  if (!ytDlpPath) {
    console.warn('[Extractor] yt-dlp binary not found');
    return Promise.resolve(null);
  }

  const ffmpegDir = getFfmpegDir();
  const args = [
    '--dump-single-json',
    '--no-warnings',
    '--no-playlist',
    '--playlist-items', '1',
    '--skip-download',
    '--no-check-certificates',
    '--extractor-args', 'youtube:player_client=visionos,android,web',
    '--js-runtimes', 'node',
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  ];

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
      resolve(null);
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
      resolve(null);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0 || !stdoutData.trim()) {
        resolve(null);
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

        resolve(extracted);
      } catch (parseErr) {
        console.error('[Extractor] Error parsing yt-dlp JSON:', parseErr);
        resolve(null);
      }
    });
  });
}

/**
 * Stream downloaded media directly to HTTP response.
 * Strategy:
 * 1. Build yt-dlp command with flexible format selection (video or audio)
 * 2. Attempt normal download; if that fails, retry with --force-generic-extractor
 * 3. Dynamically discover output file in temp directory (regardless of whether it ended up as .mp4, .m4a, .webm, etc.)
 * 4. Pipe to response with appropriate Content-Disposition and Content-Type
 */
export function streamMediaDownload(url: string, filename: string, res: Response, compress = false) {
  const ytDlpPath = getYtDlpPath();
  if (!ytDlpPath) {
    res.status(500).json({ error: { code: 'EXTRACTOR_MISSING', message: 'Downloader engine not available' } });
    return;
  }

  const ffmpegDir = getFfmpegDir();
  let safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_').trim();
  if (!/\.(mp4|webm|mkv|mov|m4v|mp3|m4a)$/i.test(safeFilename)) {
    safeFilename += '.mp4';
  }

  // Format selection: auto download in 1080p Full HD (both horizontal & vertical), falling back to highest available
  const formatSelection = compress
    ? 'bestvideo[height<=480]+bestaudio/bestvideo[width<=480]+bestaudio/best[height<=480]/best'
    : 'bestvideo[height<=1080]+bestaudio/bestvideo[width<=1080]+bestaudio/best[height<=1080]/best[width<=1080]/bestvideo+bestaudio/best';

  let currentUrl = url;
  const tempPrefix = `clipnest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempOutputFile = path.join(os.tmpdir(), `${tempPrefix}_%(title).70B.%(ext)s`);

  const buildArgs = (useGeneric: boolean) => {
    const args = [
      '-o', tempOutputFile,
      '-f', formatSelection,
      '--merge-output-format', 'mp4',
      '--concurrent-fragments', '4',
      '--no-warnings',
      '--no-playlist',
      '--playlist-items', '1',
      '--no-check-certificates',
      '--extractor-args', 'youtube:player_client=visionos,android,web',
      '--js-runtimes', 'node',
      '--user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    ];
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
    } catch {
      // ignore
    }
  };

  const attemptDownload = (useGeneric: boolean) => {
    const args = buildArgs(useGeneric);
    const child = spawn(ytDlpPath, args, { windowsHide: true });
    let fullStderr = '';

    child.stderr.on('data', (data) => {
      const msg = data.toString();
      fullStderr += msg;
      console.error(`[Extractor Stream${useGeneric ? ' Generic' : ''}]`, msg.trim());
    });

    child.on('error', (err) => {
      console.error('[Extractor Stream] Spawn error:', err);
      if (!res.headersSent) {
        res.status(500).end('Failed to initialize download');
      }
      cleanupTempFiles();
    });

    child.on('close', (code) => {
      // Check if any output file was produced
      let actualFile: string | null = null;
      try {
        const matches = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith(tempPrefix) && !f.endsWith('.part'));
        if (matches.length > 0) {
          actualFile = path.join(os.tmpdir(), matches[0]);
        }
      } catch {
        // ignore
      }

      if (code !== 0 || !actualFile) {
        console.warn(`[Extractor Stream] yt-dlp exited with code ${code}${useGeneric ? ' (generic)' : ''}`);

        // If first attempt failed and generic not tried yet, retry ONLY for unknown/non-platform sites
        const isKnownPlatform = /youtube\.com|youtu\.be|instagram\.com|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.watch|reddit\.com|vimeo\.com/i.test(currentUrl);
        if (!useGeneric && !isKnownPlatform && !res.headersSent) {
          console.log('[Extractor Stream] Retrying with generic extractor...');
          cleanupTempFiles();
          attemptDownload(true);
          return;
        }

        // If generic extractor also failed, scrape webpage HTML for embedded media streams (m3u8, mp4, etc.)
        if (useGeneric && !res.headersSent && (currentUrl.startsWith('http://') || currentUrl.startsWith('https://'))) {
          console.log('[Extractor Stream] Attempting HTML media scrape for embedded stream...');
          scrapeHtmlMedia(currentUrl)
            .then((scraped) => {
              if (scraped && scraped.directUrl && scraped.directUrl !== currentUrl) {
                console.log('[Extractor Stream] Found embedded stream via HTML scraper:', scraped.directUrl);
                cleanupTempFiles();
                currentUrl = scraped.directUrl;
                attemptDownload(false);
              } else if (!res.headersSent) {
                const errorLine = fullStderr.split('\n').filter((l) => l.includes('ERROR:')).join(' ').trim();
                res.status(500).end(errorLine || 'Download failed — no extractable media stream found on this page.');
                cleanupTempFiles();
              }
            })
            .catch(() => {
              if (!res.headersSent) {
                const errorLine = fullStderr.split('\n').filter((l) => l.includes('ERROR:')).join(' ').trim();
                res.status(500).end(errorLine || 'Download failed — no extractable media stream found on this page.');
                cleanupTempFiles();
              }
            });
          return;
        }

        if (!res.headersSent) {
          const errorLine = fullStderr.split('\n').filter((l) => l.includes('ERROR:')).join(' ').trim();
          res.status(500).end(errorLine || 'Download failed — no extractable media stream found.');
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

    // If client disconnects or aborts, kill process and clean up
    res.on('close', () => {
      child.kill('SIGTERM');
      cleanupTempFiles();
    });
  };

  // Start download attempt
  attemptDownload(false);
}

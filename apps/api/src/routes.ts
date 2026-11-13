import { Router, Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  LinkInspectionRequestSchema,
  LinkInspectionResponseSchema,
  ApiErrorResponse,
} from '@clipnest/shared';
import { inspectUrl } from './inspector.js';
import { SSRFSecurityError } from './ssrf-shield.js';
import { streamMediaDownload, getCookiesPath, getAvailableBrowsers, cleanTargetUrl } from './extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const apiRouter = Router();

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'clipnest-api',
    version: '1.0.0',
    hasCookies: Boolean(getCookiesPath()),
    availableBrowsers: getAvailableBrowsers(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Cookies management routes (to authenticate Instagram stories, private reels & YouTube)
 */
apiRouter.get('/cookies/status', (_req: Request, res: Response) => {
  const cookieFile = getCookiesPath();
  res.json({
    hasCookies: Boolean(cookieFile),
    path: cookieFile ? path.basename(cookieFile) : null,
    availableBrowsers: getAvailableBrowsers(),
  });
});

apiRouter.post('/cookies', (req: Request, res: Response): void => {
  const content = req.body?.cookies;
  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'Missing cookie text content' });
    return;
  }

  try {
    const targetPath = path.resolve(__dirname, '../cookies.txt');
    fs.writeFileSync(targetPath, content.trim(), 'utf8');
    res.json({ success: true, message: 'Cookies saved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to save cookies: ${err.message}` });
  }
});

apiRouter.delete('/cookies', (_req: Request, res: Response) => {
  const cookieFile = getCookiesPath();
  if (cookieFile && fs.existsSync(cookieFile)) {
    try {
      fs.unlinkSync(cookieFile);
    } catch {}
  }
  res.json({ success: true, message: 'Cookies removed' });
});

apiRouter.get('/download/stream', (req: Request, res: Response): void => {
  const rawUrl = (req.query.url as string) || '';
  const rawTitle = (req.query.title as string) || 'download';
  const compress = req.query.compress === 'true' || req.query.compress === '1';

  if (!rawUrl || typeof rawUrl !== 'string') {
    res.status(400).send('Missing target video URL');
    return;
  }

  const targetUrl = cleanTargetUrl(rawUrl);
  const filename = `${rawTitle.replace(/[/\\?%*:|"<>]/g, '_')}${compress ? '_compact' : ''}.mp4`;
  streamMediaDownload(targetUrl, filename, res, compress);
});

apiRouter.post('/links/inspect', async (req: Request, res: Response): Promise<void> => {
  const parsedBody = LinkInspectionRequestSchema.safeParse(req.body);

  if (!parsedBody.success) {
    const errorDetails = parsedBody.error.errors.map((e) => e.message).join(', ');
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_URL',
        message: 'Invalid link inspection request.',
        details: errorDetails,
      },
    };
    res.status(400).json(errPayload);
    return;
  }

  try {
    const cleanUrl = cleanTargetUrl(parsedBody.data.url);
    const result = await inspectUrl(cleanUrl, req.hostname);
    const validatedResponse = LinkInspectionResponseSchema.parse(result);
    res.json(validatedResponse);
  } catch (err: any) {
    if (err instanceof SSRFSecurityError) {
      const errPayload: ApiErrorResponse = {
        error: {
          code: 'SSRF_ATTEMPT_BLOCKED',
          message: 'The requested link targets a restricted private or internal network address.',
        },
      };
      res.status(403).json(errPayload);
      return;
    }

    const errPayload: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while inspecting the link.',
      },
    };
    res.status(500).json(errPayload);
  }
});

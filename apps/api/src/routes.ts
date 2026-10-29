import { Router, Request, Response } from 'express';
import {
  LinkInspectionRequestSchema,
  LinkInspectionResponseSchema,
  ApiErrorResponse,
} from '@clipnest/shared';
import { inspectUrl } from './inspector.js';
import { SSRFSecurityError } from './ssrf-shield.js';
import { streamMediaDownload } from './extractor.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'clipnest-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get('/download/stream', (req: Request, res: Response): void => {
  let targetUrl = (req.query.url as string) || '';
  const rawTitle = (req.query.title as string) || 'download';
  const compress = req.query.compress === 'true' || req.query.compress === '1';

  if (!targetUrl || typeof targetUrl !== 'string') {
    res.status(400).send('Missing target video URL');
    return;
  }

  targetUrl = targetUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  // Normalize youtu.be, shorts, and share tracking URLs to canonical watch links
  try {
    const parsed = new URL(targetUrl);
    if (parsed.hostname.toLowerCase().includes('youtu.be')) {
      const vidId = parsed.pathname.slice(1).split('/')[0]?.split('?')[0];
      if (vidId) {
        targetUrl = `https://www.youtube.com/watch?v=${vidId}`;
      }
    } else if (parsed.hostname.toLowerCase().includes('youtube.com')) {
      const vidId = parsed.searchParams.get('v');
      if (vidId) {
        targetUrl = `https://www.youtube.com/watch?v=${vidId}`;
      } else if (parsed.pathname.includes('/shorts/')) {
        const shortId = parsed.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0];
        if (shortId) {
          targetUrl = `https://www.youtube.com/watch?v=${shortId}`;
        }
      }
    }
  } catch {}

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
    const result = await inspectUrl(parsedBody.data.url, req.hostname);
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

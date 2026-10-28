import { describe, it, expect, before as beforeAll, after as afterAll } from './test-framework.ts';
import http from 'node:http';

describe('Backend API Endpoints (/api/v1)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const { default: app } = await import('../apps/api/dist/server.js');
    await new Promise<void>((resolve) => {
      // Listen on ephemeral port on 127.0.0.1 for testing
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /health returns status ok with timestamp', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('clipnest-api');
    expect(data.timestamp).toBeDefined();
  });

  it('POST /links/inspect returns 400 when URL is missing or malformed', async () => {
    const res = await fetch(`${baseUrl}/links/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'javascript:alert(1)' }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_URL');
    // Ensure no stack trace leaks
    expect(data.stack).toBeUndefined();
  });

  it('POST /links/inspect extracts video stream and returns downloadable action', async () => {
    const res = await fetch(`${baseUrl}/links/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.platform).toBe('youtube');
    expect(data.status).toBe('direct_download_available');
    expect(data.availableActions).toContain('download');
    expect(data.directMediaUrl).toBeDefined();
    expect(data.title).toContain('Rick Astley');
  });

  it('POST /links/inspect blocks SSRF loopback targets with 403', async () => {
    const res = await fetch(`${baseUrl}/links/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:8080/secret' }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe('SSRF_ATTEMPT_BLOCKED');
  });
});

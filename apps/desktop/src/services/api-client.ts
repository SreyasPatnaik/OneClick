import {
  LinkInspectionResult,
  inspectUrlLocally,
  LinkInspectionResponseSchema,
} from '@clipnest/shared';

// Supports Vercel deployment with remote Render backend via VITE_API_URL, fallback to /api/v1 for local/proxy
const RAW_API_URL = (import.meta.env.VITE_API_URL as string) || '';
export const API_BASE_URL = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api/v1` : '/api/v1';

export async function inspectLink(url: string): Promise<LinkInspectionResult> {
  // Try inspecting via Backend API with sufficient timeout for extraction
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${API_BASE_URL}/links/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const parsed = LinkInspectionResponseSchema.safeParse(data);
      if (parsed.success) {
        return parsed.data;
      }
    }
  } catch (_apiError) {
    // API server not running or network error; fall back to local engine
  }

  // Resilient fallback: run client-side shared engine
  return inspectUrlLocally(url);
}

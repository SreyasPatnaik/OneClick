import { DownloadRecord, extractFilenameFromUrl } from '@clipnest/shared';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      chooseDirectory: () => Promise<string | null>;
      openPath: (filePath: string) => Promise<string>;
      showItemInFolder: (filePath: string) => Promise<void>;
      readClipboard: () => Promise<string>;
      startDownload: (args: {
        id: string;
        url: string;
        filename: string;
        saveDirectory?: string;
      }) => Promise<{ success: boolean; localPath?: string; error?: string }>;
      onDownloadProgress: (
        callback: (event: {
          id: string;
          downloadedBytes: number;
          totalBytes: number;
          progressPercent: number;
          speedBytesPerSec: number;
        }) => void
      ) => () => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
    };
  }
}

export type ProgressCallback = (update: Partial<DownloadRecord>) => void;

export async function executeDownload(
  record: DownloadRecord,
  saveDirectory: string,
  onProgress: ProgressCallback
): Promise<{ success: boolean; localPath?: string; error?: string }> {
  const isElectron = Boolean(window.electronAPI?.isElectron);

  if (isElectron && window.electronAPI) {
    // Native Electron Download
    const unsubscribe = window.electronAPI.onDownloadProgress((event) => {
      if (event.id === record.id) {
        onProgress({
          downloadedBytes: event.downloadedBytes,
          sizeBytes: event.totalBytes || record.sizeBytes,
          progressPercent: event.progressPercent,
          speedBytesPerSec: event.speedBytesPerSec,
        });
      }
    });

    try {
      const result = await window.electronAPI.startDownload({
        id: record.id,
        url: record.downloadUrl,
        filename: record.displayName || extractFilenameFromUrl(record.downloadUrl),
        saveDirectory,
      });

      unsubscribe();

      if (result.success) {
        onProgress({
          status: 'completed',
          progressPercent: 100,
          localPath: result.localPath,
          completedAt: new Date().toISOString(),
        });
        return { success: true, localPath: result.localPath };
      } else {
        onProgress({
          status: 'failed',
          errorMessage: result.error || 'Native download failed',
        });
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      unsubscribe();
      onProgress({
        status: 'failed',
        errorMessage: err.message || 'Download exception',
      });
      return { success: false, error: err.message };
    }
  }

  // Direct API Stream: Trigger native browser download directly
  // This bypasses in-memory buffering, prevents blob GUID naming, and saves with proper .mp4 extension
  if (record.downloadUrl.includes('/api/v1/download/stream')) {
    let safeName = (record.displayName || 'clipnest_video').trim().replace(/[/\\?%*:|"<>]/g, '_');
    if (!/\.(mp4|webm|mkv|mov|m4v)$/i.test(safeName)) {
      safeName += '.mp4';
    }

    const a = document.createElement('a');
    a.href = record.downloadUrl;
    a.download = safeName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    onProgress({
      status: 'completed',
      progressPercent: 100,
      completedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  // Web Browser Fallback: Streamed Fetch + Blob Save for external direct media URLs
  try {
    const response = await fetch(record.downloadUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : record.sizeBytes || 0;

    if (!response.body) {
      const blob = await response.blob();
      saveBlobLocally(blob, record.displayName);
      onProgress({
        status: 'completed',
        progressPercent: 100,
        downloadedBytes: blob.size,
        completedAt: new Date().toISOString(),
      });
      return { success: true };
    }

    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];
    let lastTime = Date.now();
    let bytesSinceLast = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedBytes += value.length;
      bytesSinceLast += value.length;

      const now = Date.now();
      if (now - lastTime >= 250) {
        const elapsed = (now - lastTime) / 1000;
        const speed = Math.round(bytesSinceLast / elapsed);
        const percent = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0;

        onProgress({
          downloadedBytes: receivedBytes,
          sizeBytes: totalBytes || receivedBytes,
          progressPercent: percent,
          speedBytesPerSec: speed,
        });

        lastTime = now;
        bytesSinceLast = 0;
      }
    }

    const combinedBlob = new Blob(chunks as BlobPart[], { type: record.mimeType || 'video/mp4' });
    saveBlobLocally(combinedBlob, record.displayName);

    onProgress({
      status: 'completed',
      progressPercent: 100,
      downloadedBytes: receivedBytes,
      completedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err: any) {
    onProgress({
      status: 'failed',
      errorMessage: err.message || 'Web download failed',
    });
    return { success: false, error: err.message };
  }
}

function saveBlobLocally(blob: Blob, filename: string): void {
  let safeName = (filename || 'clipnest_video').trim().replace(/[/\\?%*:|"<>]/g, '_');
  if (!/\.(mp4|webm|mkv|mov|m4v|mp3|m4a)$/i.test(safeName)) {
    safeName += '.mp4';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Keep object URL alive for 5 minutes so Windows/Chrome finishes writing without falling back to GUID
  setTimeout(() => URL.revokeObjectURL(url), 300000);
}

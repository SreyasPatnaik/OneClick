import { useState, useEffect, useCallback } from 'react';
import {
  DownloadRecord,
  LinkInspectionResult,
  extractFilenameFromUrl,
} from '@clipnest/shared';
import {
  loadDownloadRecords,
  saveDownloadRecords,
  loadSettings,
} from '../services/storage.js';
import { executeDownload } from '../services/downloader.js';

export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadRecord[]>(() => loadDownloadRecords());

  useEffect(() => {
    saveDownloadRecords(downloads);
  }, [downloads]);

  const updateRecord = useCallback((id: string, updates: Partial<DownloadRecord>) => {
    setDownloads((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, ...updates } : rec))
    );
  }, []);

  const startDownload = useCallback(
    async (inspection: LinkInspectionResult) => {
      const downloadUrl = inspection.directMediaUrl || inspection.url;
      let filename = (inspection.title || extractFilenameFromUrl(downloadUrl)).trim();
      if (!filename || filename === 'media' || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(filename)) {
        filename = `${inspection.platform}_${filename || Date.now()}`;
      }
      if (!/\.(mp4|webm|mkv|mov|m4v|mp3|m4a)$/i.test(filename)) {
        filename += '.mp4';
      }

      const id = 'dl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const newRecord: DownloadRecord = {
        id,
        originalUrl: inspection.url,
        downloadUrl,
        sourceHost: inspection.displayHost,
        displayName: filename,
        status: 'downloading',
        createdAt: new Date().toISOString(),
        mimeType: inspection.mediaType || 'video/mp4',
        sizeBytes: inspection.sizeBytes || undefined,
        downloadedBytes: 0,
        progressPercent: 0,
        speedBytesPerSec: 0,
      };

      setDownloads((prev) => [newRecord, ...prev]);

      const settings = loadSettings();
      await executeDownload(
        newRecord,
        settings.downloadDirectory,
        (progressUpdates) => {
          updateRecord(id, progressUpdates);
        }
      );
    },
    [updateRecord]
  );

  const retryDownload = useCallback(
    async (id: string) => {
      const record = downloads.find((d) => d.id === id);
      if (!record) return;

      updateRecord(id, {
        status: 'downloading',
        downloadedBytes: 0,
        progressPercent: 0,
        errorMessage: undefined,
      });

      const settings = loadSettings();
      await executeDownload(
        record,
        settings.downloadDirectory,
        (progressUpdates) => {
          updateRecord(id, progressUpdates);
        }
      );
    },
    [downloads, updateRecord]
  );

  const removeDownload = useCallback((id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setDownloads((prev) => prev.filter((d) => d.status === 'downloading'));
  }, []);

  return {
    downloads,
    startDownload,
    retryDownload,
    removeDownload,
    clearCompleted,
  };
}

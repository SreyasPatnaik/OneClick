import { DownloadRecord, AppSettings } from '@clipnest/shared';

const STORAGE_KEYS = {
  DOWNLOADS: 'clipnest_downloads_v1',
  SETTINGS: 'clipnest_settings_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  downloadDirectory: 'Downloads/OneClick',
  autoInspectClipboard: true,
  safeSSRF: true,
  maxConcurrentDownloads: 3,
  autoOpenOnComplete: false,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load settings from storage', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to storage', err);
  }
}

export function loadDownloadRecords(): DownloadRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DOWNLOADS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load downloads from storage', err);
  }
  return [];
}

export function saveDownloadRecords(records: DownloadRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save downloads to storage', err);
  }
}

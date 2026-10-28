export type PlatformType =
  | 'youtube'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'twitter'
  | 'vimeo'
  | 'direct_media'
  | 'website'
  | 'unknown';

export type LinkStatus =
  | 'direct_download_available'
  | 'official_action_available'
  | 'permission_required'
  | 'unsupported'
  | 'invalid_link'
  | 'temporarily_unavailable';

export type AvailableAction =
  | 'download'
  | 'open_official'
  | 'open_source'
  | 'copy_url'
  | 'retry';

export interface OfficialGuidance {
  platformName: string;
  officialWebUrl?: string;
  explanation: string;
  suggestedActionLabel: string;
  policyNotes?: string;
}

export interface LinkInspectionResult {
  url: string;
  platform: PlatformType;
  status: LinkStatus;
  displayHost: string;
  title: string | null;
  mediaType: string | null;
  sizeBytes: number | null;
  availableActions: AvailableAction[];
  message: string;
  officialGuidance?: OfficialGuidance;
  directMediaUrl?: string;
  inspectionTimestamp: string;
}

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'completed'
  | 'paused'
  | 'failed'
  | 'cancelled';

export interface DownloadRecord {
  id: string;
  originalUrl: string;
  downloadUrl: string;
  sourceHost: string;
  displayName: string;
  status: DownloadStatus;
  createdAt: string;
  completedAt?: string;
  localPath?: string;
  mimeType?: string;
  sizeBytes?: number;
  downloadedBytes: number;
  progressPercent: number;
  speedBytesPerSec?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  downloadDirectory: string;
  autoInspectClipboard: boolean;
  safeSSRF: boolean;
  maxConcurrentDownloads: number;
  autoOpenOnComplete: boolean;
}

export type ErrorCode =
  | 'INVALID_URL'
  | 'UNSUPPORTED_SOURCE'
  | 'DOWNLOAD_NOT_AUTHORIZED'
  | 'DIRECT_FILE_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'SSRF_ATTEMPT_BLOCKED'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: string;
  };
}

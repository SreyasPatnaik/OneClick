import { z } from 'zod';

export const SupportedSchemes = ['https:', 'http:'] as const;

export const LinkInspectionRequestSchema = z.object({
  url: z
    .string({ required_error: 'URL is required' })
    .trim()
    .min(1, 'URL cannot be empty')
    .max(2048, 'URL exceeds maximum length of 2048 characters')
    .refine((val) => {
      try {
        const parsed = new URL(val);
        return SupportedSchemes.includes(parsed.protocol as any);
      } catch {
        return false;
      }
    }, {
      message: 'URL must have a valid http: or https: protocol',
    }),
});

export type LinkInspectionRequest = z.infer<typeof LinkInspectionRequestSchema>;

export const PlatformTypeSchema = z.enum([
  'youtube',
  'instagram',
  'facebook',
  'tiktok',
  'twitter',
  'vimeo',
  'direct_media',
  'website',
  'unknown',
]);

export const LinkStatusSchema = z.enum([
  'direct_download_available',
  'official_action_available',
  'permission_required',
  'unsupported',
  'invalid_link',
  'temporarily_unavailable',
]);

export const AvailableActionSchema = z.enum([
  'download',
  'open_official',
  'open_source',
  'copy_url',
  'retry',
]);

export const OfficialGuidanceSchema = z.object({
  platformName: z.string(),
  officialWebUrl: z.string().optional(),
  explanation: z.string(),
  suggestedActionLabel: z.string(),
  policyNotes: z.string().optional(),
});

export const LinkInspectionResponseSchema = z.object({
  url: z.string(),
  platform: PlatformTypeSchema,
  status: LinkStatusSchema,
  displayHost: z.string(),
  title: z.string().nullable(),
  mediaType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  availableActions: z.array(AvailableActionSchema),
  message: z.string(),
  officialGuidance: OfficialGuidanceSchema.optional(),
  directMediaUrl: z.string().optional(),
  inspectionTimestamp: z.string(),
});

export const DownloadRecordSchema = z.object({
  id: z.string(),
  originalUrl: z.string(),
  downloadUrl: z.string(),
  sourceHost: z.string(),
  displayName: z.string(),
  status: z.enum(['queued', 'downloading', 'completed', 'paused', 'failed', 'cancelled']),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  localPath: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().optional(),
  downloadedBytes: z.number(),
  progressPercent: z.number(),
  speedBytesPerSec: z.number().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

export const AppSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  downloadDirectory: z.string(),
  autoInspectClipboard: z.boolean(),
  safeSSRF: z.boolean(),
  maxConcurrentDownloads: z.number().min(1).max(5),
  autoOpenOnComplete: z.boolean(),
});

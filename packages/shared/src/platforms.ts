import { PlatformType, LinkStatus, AvailableAction, OfficialGuidance } from './types.js';

export interface PlatformConfig {
  id: PlatformType;
  name: string;
  matchedDomains: string[];
  status: LinkStatus;
  availableActions: AvailableAction[];
  guidance: OfficialGuidance;
}

export const PLATFORM_CONFIGS: Record<Exclude<PlatformType, 'direct_media' | 'website' | 'unknown'>, PlatformConfig> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    matchedDomains: ['youtube.com', 'youtu.be', 'm.youtube.com', 'youtube-nocookie.com'],
    status: 'official_action_available',
    availableActions: ['open_official', 'copy_url'],
    guidance: {
      platformName: 'YouTube',
      officialWebUrl: 'https://youtube.com',
      explanation:
        'YouTube content protections and terms of service prohibit unauthorized stream extraction. To watch offline legally, use YouTube Premium offline saving in the official mobile app. Creators can export their own videos via YouTube Studio.',
      suggestedActionLabel: 'Open on YouTube',
      policyNotes: 'Direct video extraction is expressly forbidden to respect copyright and platform terms.',
    },
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    matchedDomains: ['instagram.com', 'instagr.am'],
    status: 'official_action_available',
    availableActions: ['open_official', 'copy_url'],
    guidance: {
      platformName: 'Instagram',
      officialWebUrl: 'https://instagram.com',
      explanation:
        'Instagram does not allow direct public downloading of reels or posts without creator authorization and Meta API access. Use Instagram’s native "Save" feature to bookmark content.',
      suggestedActionLabel: 'Open on Instagram',
      policyNotes: 'Creator rights and privacy settings are respected.',
    },
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    matchedDomains: ['facebook.com', 'fb.com', 'fb.watch', 'm.facebook.com'],
    status: 'official_action_available',
    availableActions: ['open_official', 'copy_url'],
    guidance: {
      platformName: 'Facebook',
      officialWebUrl: 'https://facebook.com',
      explanation:
        'Facebook video streams require authorized access and are subject to account privacy controls. Use the Facebook app or Meta "Download Your Information" for your own media.',
      suggestedActionLabel: 'Open on Facebook',
      policyNotes: 'Private and protected content cannot be extracted.',
    },
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    matchedDomains: ['tiktok.com', 'vm.tiktok.com', 'm.tiktok.com'],
    status: 'official_action_available',
    availableActions: ['open_official', 'copy_url'],
    guidance: {
      platformName: 'TikTok',
      officialWebUrl: 'https://tiktok.com',
      explanation:
        'TikTok links point to dynamic video feeds. If creator permissions allow, you can use the official TikTok app’s "Save Video" option directly.',
      suggestedActionLabel: 'Open on TikTok',
      policyNotes: 'Honors creator download preferences and watermarking rights.',
    },
  },
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    matchedDomains: ['twitter.com', 'x.com', 'mobile.twitter.com'],
    status: 'official_action_available',
    availableActions: ['open_official', 'copy_url'],
    guidance: {
      platformName: 'X (formerly Twitter)',
      officialWebUrl: 'https://x.com',
      explanation:
        'X restricts unauthorized automated media harvesting. You can bookmark the post or view it in the official X application.',
      suggestedActionLabel: 'Open on X',
      policyNotes: 'Automated harvesting prohibited under X Developer Terms.',
    },
  },
  vimeo: {
    id: 'vimeo',
    name: 'Vimeo',
    matchedDomains: ['vimeo.com', 'player.vimeo.com'],
    status: 'official_action_available',
    availableActions: ['open_official', 'copy_url'],
    guidance: {
      platformName: 'Vimeo',
      officialWebUrl: 'https://vimeo.com',
      explanation:
        'Vimeo allows direct downloads when enabled by the video creator. Check the official Vimeo page for a permitted "Download" button below the player.',
      suggestedActionLabel: 'Open on Vimeo',
      policyNotes: 'Direct downloads depend on creator account permissions.',
    },
  },
};

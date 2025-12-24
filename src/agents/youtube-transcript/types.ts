/**
 * YouTube Transcript Email Agent Types
 */

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  duration?: string;
  viewCount?: number;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface VideoTranscript {
  videoId: string;
  videoTitle: string;
  language: string;
  segments: TranscriptSegment[];
  fullText: string;
}

export interface VideoSummary {
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  publishedAt: Date;
  summary: string;
  keyPoints: string[];
  topics: string[];
  duration?: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string[];
}

export interface AgentConfig {
  channelUrl: string;
  channelId?: string;
  maxVideos: number;
  language: string;
  email: EmailConfig;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  youtubeApiKey?: string;
  aiProvider: 'openai' | 'anthropic' | 'local';
  aiModel: string;
  checkInterval?: number; // in minutes
  processedVideosFile?: string;
}

export interface AgentResult {
  success: boolean;
  processedVideos: number;
  summaries: VideoSummary[];
  emailSent: boolean;
  errors: string[];
}

export interface ProcessedVideoRecord {
  videoId: string;
  processedAt: Date;
  summaryHash: string;
}

/**
 * YouTube Transcript Email Agent
 * Main orchestrator that coordinates all services
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { YouTubeChannelService } from './youtube-channel';
import { TranscriptExtractor } from './transcript-extractor';
import { Summarizer } from './summarizer';
import { EmailSender } from './email-sender';
import {
  AgentConfig,
  AgentResult,
  ProcessedVideoRecord,
  VideoSummary,
  YouTubeVideo,
} from './types';
import { logger } from '../../utils';

export class YouTubeTranscriptEmailAgent extends EventEmitter {
  private config: AgentConfig;
  private youtubeService: YouTubeChannelService;
  private transcriptExtractor: TranscriptExtractor;
  private summarizer: Summarizer;
  private emailSender: EmailSender;
  private processedVideos: Map<string, ProcessedVideoRecord>;
  private processedVideosFile: string;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.processedVideosFile = config.processedVideosFile ||
      path.join(process.cwd(), 'data', 'processed-videos.json');

    // Initialize services
    this.youtubeService = new YouTubeChannelService(config.channelUrl, config.youtubeApiKey);
    this.transcriptExtractor = new TranscriptExtractor(config.language || 'en');
    this.summarizer = new Summarizer({
      provider: config.aiProvider,
      apiKey: config.aiProvider === 'anthropic'
        ? config.anthropicApiKey!
        : config.openaiApiKey!,
      model: config.aiModel,
    });
    this.emailSender = new EmailSender(config.email);

    // Load processed videos history
    this.processedVideos = this.loadProcessedVideos();
  }

  /**
   * Run the agent - main entry point
   */
  async run(): Promise<AgentResult> {
    const result: AgentResult = {
      success: false,
      processedVideos: 0,
      summaries: [],
      emailSent: false,
      errors: [],
    };

    try {
      logger.info('Starting YouTube Transcript Email Agent', {
        channel: this.config.channelUrl,
        maxVideos: this.config.maxVideos,
      });

      this.emit('start', { channel: this.config.channelUrl });

      // Step 1: Fetch latest videos from channel
      this.emit('progress', { phase: 'fetching', message: 'Fetching videos from channel...' });
      const videos = await this.youtubeService.getLatestVideos(this.config.maxVideos);

      if (videos.length === 0) {
        logger.warn('No videos found on the channel');
        result.errors.push('No videos found on the channel');
        return result;
      }

      logger.info(`Found ${videos.length} videos`);

      // Step 2: Filter out already processed videos
      const newVideos = this.filterNewVideos(videos);

      if (newVideos.length === 0) {
        logger.info('No new videos to process');
        result.success = true;
        this.emit('complete', { message: 'No new videos to process' });
        return result;
      }

      logger.info(`Processing ${newVideos.length} new videos`);

      // Step 3: Fetch transcripts for new videos
      this.emit('progress', { phase: 'transcripts', message: 'Fetching transcripts...' });
      const transcripts = await this.transcriptExtractor.getTranscripts(newVideos);

      if (transcripts.size === 0) {
        logger.warn('No transcripts available for any video');
        result.errors.push('No transcripts available for any video');
        return result;
      }

      // Step 4: Generate summaries
      this.emit('progress', { phase: 'summarizing', message: 'Generating summaries...' });
      const summaries: VideoSummary[] = [];

      for (const [videoId, transcript] of transcripts) {
        const video = newVideos.find((v) => v.id === videoId);
        if (!video) continue;

        try {
          this.emit('progress', {
            phase: 'summarizing',
            message: `Summarizing: ${video.title}`,
          });

          const summary = await this.summarizer.summarize(video, transcript);
          summaries.push(summary);

          // Mark video as processed
          this.markAsProcessed(video, summary);

          logger.info(`Generated summary for: ${video.title}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to summarize video: ${video.title} - ${errorMessage}`);
          result.errors.push(`Failed to summarize: ${video.title}`);
        }
      }

      result.summaries = summaries;
      result.processedVideos = summaries.length;

      // Step 5: Send email with summaries
      if (summaries.length > 0) {
        this.emit('progress', { phase: 'email', message: 'Sending email...' });

        const channelName = videos[0]?.channelTitle || 'YouTube Channel';
        const emailSent = await this.emailSender.sendSummaryEmail(summaries, channelName);

        result.emailSent = emailSent;

        if (emailSent) {
          logger.info('Email sent successfully');
          // Save processed videos after successful email
          this.saveProcessedVideos();
        } else {
          result.errors.push('Failed to send email');
        }
      }

      result.success = result.errors.length === 0;
      this.emit('complete', { summaries: summaries.length, emailSent: result.emailSent });

      logger.info('Agent run completed', {
        processedVideos: result.processedVideos,
        emailSent: result.emailSent,
        errors: result.errors.length,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Agent run failed: ${errorMessage}`);
      result.errors.push(errorMessage);
      this.emit('error', { error: errorMessage });
      return result;
    }
  }

  /**
   * Run the agent in watch mode (continuous monitoring)
   */
  async runWatchMode(): Promise<void> {
    const checkInterval = (this.config.checkInterval || 60) * 60 * 1000; // Convert to ms

    logger.info(`Starting watch mode, checking every ${this.config.checkInterval || 60} minutes`);

    const runCheck = async () => {
      try {
        await this.run();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Watch mode check failed: ${errorMessage}`);
      }
    };

    // Run immediately
    await runCheck();

    // Schedule recurring checks
    setInterval(runCheck, checkInterval);
  }

  /**
   * Filter out already processed videos
   */
  private filterNewVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
    return videos.filter((video) => !this.processedVideos.has(video.id));
  }

  /**
   * Mark a video as processed
   */
  private markAsProcessed(video: YouTubeVideo, summary: VideoSummary): void {
    const hash = crypto
      .createHash('md5')
      .update(summary.summary)
      .digest('hex');

    this.processedVideos.set(video.id, {
      videoId: video.id,
      processedAt: new Date(),
      summaryHash: hash,
    });
  }

  /**
   * Load processed videos from file
   */
  private loadProcessedVideos(): Map<string, ProcessedVideoRecord> {
    const map = new Map<string, ProcessedVideoRecord>();

    try {
      if (fs.existsSync(this.processedVideosFile)) {
        const data = fs.readFileSync(this.processedVideosFile, 'utf-8');
        const records = JSON.parse(data) as ProcessedVideoRecord[];

        for (const record of records) {
          map.set(record.videoId, {
            ...record,
            processedAt: new Date(record.processedAt),
          });
        }

        logger.info(`Loaded ${map.size} processed video records`);
      }
    } catch (error) {
      logger.warn('Failed to load processed videos file, starting fresh');
    }

    return map;
  }

  /**
   * Save processed videos to file
   */
  private saveProcessedVideos(): void {
    try {
      const dir = path.dirname(this.processedVideosFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const records = Array.from(this.processedVideos.values());
      fs.writeFileSync(this.processedVideosFile, JSON.stringify(records, null, 2));

      logger.info(`Saved ${records.length} processed video records`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to save processed videos file: ${errorMessage}`);
    }
  }

  /**
   * Clear processed videos history
   */
  clearHistory(): void {
    this.processedVideos.clear();
    if (fs.existsSync(this.processedVideosFile)) {
      fs.unlinkSync(this.processedVideosFile);
    }
    logger.info('Cleared processed videos history');
  }

  /**
   * Get agent status
   */
  getStatus(): {
    channel: string;
    processedCount: number;
    lastProcessed: Date | null;
  } {
    const records = Array.from(this.processedVideos.values());
    const lastProcessed = records.length > 0
      ? records.reduce((latest, record) =>
          record.processedAt > latest.processedAt ? record : latest
        ).processedAt
      : null;

    return {
      channel: this.config.channelUrl,
      processedCount: this.processedVideos.size,
      lastProcessed,
    };
  }
}

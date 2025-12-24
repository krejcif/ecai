/**
 * YouTube Transcript Extractor Service
 * Fetches and processes transcripts from YouTube videos
 */

import { YoutubeTranscript } from 'youtube-transcript';
import { TranscriptSegment, VideoTranscript, YouTubeVideo } from './types';
import { logger } from '../../utils';

export class TranscriptExtractor {
  private language: string;

  constructor(language: string = 'en') {
    this.language = language;
  }

  /**
   * Fetch transcript for a single video
   */
  async getTranscript(video: YouTubeVideo): Promise<VideoTranscript | null> {
    logger.info(`Fetching transcript for video: ${video.title}`, { videoId: video.id });

    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(video.id, {
        lang: this.language,
      });

      if (!transcriptItems || transcriptItems.length === 0) {
        logger.warn(`No transcript available for video: ${video.title}`);
        return null;
      }

      const segments: TranscriptSegment[] = transcriptItems.map((item) => ({
        text: item.text,
        start: item.offset / 1000, // Convert to seconds
        duration: item.duration / 1000,
      }));

      const fullText = segments.map((s) => s.text).join(' ');

      logger.info(`Successfully fetched transcript`, {
        videoId: video.id,
        segmentCount: segments.length,
        textLength: fullText.length,
      });

      return {
        videoId: video.id,
        videoTitle: video.title,
        language: this.language,
        segments,
        fullText,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for common transcript unavailability reasons
      if (errorMessage.includes('Transcript is disabled') ||
          errorMessage.includes('No transcript')) {
        logger.info(`Transcript not available for video: ${video.title}`, { reason: 'disabled or unavailable' });
      } else {
        logger.error(`Failed to fetch transcript for video: ${video.title} - ${errorMessage}`);
      }

      return null;
    }
  }

  /**
   * Fetch transcripts for multiple videos
   */
  async getTranscripts(videos: YouTubeVideo[]): Promise<Map<string, VideoTranscript>> {
    const transcripts = new Map<string, VideoTranscript>();

    for (const video of videos) {
      try {
        const transcript = await this.getTranscript(video);
        if (transcript) {
          transcripts.set(video.id, transcript);
        }
        // Add a small delay to avoid rate limiting
        await this.delay(500);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error processing video ${video.id}: ${errorMessage}`);
      }
    }

    logger.info(`Fetched transcripts for ${transcripts.size}/${videos.length} videos`);
    return transcripts;
  }

  /**
   * Clean and normalize transcript text
   */
  cleanTranscript(text: string): string {
    return text
      // Remove music/sound indicators
      .replace(/\[.*?\]/g, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Fix common transcription artifacts
      .replace(/\s([.,!?])/g, '$1')
      // Trim
      .trim();
  }

  /**
   * Split transcript into chunks for processing
   */
  splitIntoChunks(text: string, maxChunkSize: number = 4000): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

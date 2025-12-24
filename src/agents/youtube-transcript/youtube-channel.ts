/**
 * YouTube Channel Service
 * Fetches video list from a YouTube channel
 */

import axios from 'axios';
import { YouTubeVideo } from './types';
import { logger } from '../../utils';

export class YouTubeChannelService {
  private channelUrl: string;
  private channelId: string | null = null;

  constructor(channelUrl: string) {
    this.channelUrl = channelUrl;
  }

  /**
   * Extract channel ID or handle from URL
   */
  private parseChannelUrl(): { type: 'handle' | 'id' | 'user'; value: string } {
    const url = this.channelUrl.replace(/^https?:\/\/(m\.|www\.)?youtube\.com/, '');

    // Handle format: /@channelname
    const handleMatch = url.match(/^\/@([^\/\?]+)/);
    if (handleMatch) {
      return { type: 'handle', value: handleMatch[1] };
    }

    // Channel ID format: /channel/UC...
    const channelMatch = url.match(/^\/channel\/([^\/\?]+)/);
    if (channelMatch) {
      return { type: 'id', value: channelMatch[1] };
    }

    // User format: /user/username or /c/customname
    const userMatch = url.match(/^\/(user|c)\/([^\/\?]+)/);
    if (userMatch) {
      return { type: 'user', value: userMatch[2] };
    }

    throw new Error(`Unable to parse YouTube channel URL: ${this.channelUrl}`);
  }

  /**
   * Fetch channel page and extract video information
   * Uses web scraping approach to avoid API key requirement
   */
  async getLatestVideos(maxVideos: number = 10): Promise<YouTubeVideo[]> {
    const parsed = this.parseChannelUrl();
    logger.info(`Fetching videos from YouTube channel`, { type: parsed.type, value: parsed.value });

    try {
      // Construct the videos tab URL
      let videosUrl: string;
      if (parsed.type === 'handle') {
        videosUrl = `https://www.youtube.com/@${parsed.value}/videos`;
      } else if (parsed.type === 'id') {
        videosUrl = `https://www.youtube.com/channel/${parsed.value}/videos`;
      } else {
        videosUrl = `https://www.youtube.com/c/${parsed.value}/videos`;
      }

      const response = await axios.get(videosUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        timeout: 30000,
      });

      const html = response.data as string;
      const videos = this.parseVideosFromHtml(html, maxVideos);

      logger.info(`Found ${videos.length} videos from channel`);
      return videos;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to fetch YouTube channel videos: ${errorMessage}`);
      throw new Error(`Failed to fetch YouTube channel: ${errorMessage}`);
    }
  }

  /**
   * Parse video information from YouTube HTML response
   */
  private parseVideosFromHtml(html: string, maxVideos: number): YouTubeVideo[] {
    const videos: YouTubeVideo[] = [];

    // Extract the initial data JSON from the page
    const ytInitialDataMatch = html.match(/var ytInitialData = ({.*?});/s);
    if (!ytInitialDataMatch) {
      // Try alternative pattern
      const altMatch = html.match(/ytInitialData\s*=\s*({.*?});/s);
      if (!altMatch) {
        logger.warn('Could not find ytInitialData in page HTML');
        return this.parseVideosFromHtmlFallback(html, maxVideos);
      }
    }

    try {
      const jsonStr = ytInitialDataMatch?.[1] || '';
      const data = JSON.parse(jsonStr);

      // Navigate to the video list in the data structure
      const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const videosTab = tabs.find((tab: Record<string, unknown>) =>
        (tab.tabRenderer as Record<string, unknown>)?.title === 'Videos'
      );

      if (!videosTab) {
        return this.parseVideosFromHtmlFallback(html, maxVideos);
      }

      const videoItems = videosTab.tabRenderer?.content?.richGridRenderer?.contents || [];

      for (const item of videoItems) {
        if (videos.length >= maxVideos) break;

        const videoRenderer = item.richItemRenderer?.content?.videoRenderer;
        if (!videoRenderer) continue;

        const video: YouTubeVideo = {
          id: videoRenderer.videoId,
          title: videoRenderer.title?.runs?.[0]?.text || 'Unknown Title',
          description: videoRenderer.descriptionSnippet?.runs?.[0]?.text || '',
          publishedAt: this.parseRelativeTime(videoRenderer.publishedTimeText?.simpleText || ''),
          thumbnailUrl: videoRenderer.thumbnail?.thumbnails?.[0]?.url || '',
          channelId: videoRenderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '',
          channelTitle: videoRenderer.ownerText?.runs?.[0]?.text || '',
          duration: videoRenderer.lengthText?.simpleText,
          viewCount: this.parseViewCount(videoRenderer.viewCountText?.simpleText || ''),
        };

        videos.push(video);
      }
    } catch (parseError) {
      logger.warn('Failed to parse ytInitialData JSON, using fallback', { error: parseError });
      return this.parseVideosFromHtmlFallback(html, maxVideos);
    }

    return videos;
  }

  /**
   * Fallback HTML parsing using regex
   */
  private parseVideosFromHtmlFallback(html: string, maxVideos: number): YouTubeVideo[] {
    const videos: YouTubeVideo[] = [];

    // Find video IDs and titles from the page
    const videoPattern = /"videoId":"([^"]+)".*?"title":\{"runs":\[\{"text":"([^"]+)"\}\]/g;
    let match;
    const seen = new Set<string>();

    while ((match = videoPattern.exec(html)) !== null && videos.length < maxVideos) {
      const [, videoId, title] = match;

      // Skip duplicates
      if (seen.has(videoId)) continue;
      seen.add(videoId);

      videos.push({
        id: videoId,
        title: title,
        description: '',
        publishedAt: new Date(),
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channelId: '',
        channelTitle: '',
      });
    }

    return videos;
  }

  /**
   * Parse relative time string to Date
   */
  private parseRelativeTime(timeStr: string): Date {
    const now = new Date();

    if (!timeStr) return now;

    const match = timeStr.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/i);
    if (!match) return now;

    const [, amount, unit] = match;
    const value = parseInt(amount, 10);

    switch (unit.toLowerCase()) {
      case 'minute':
        now.setMinutes(now.getMinutes() - value);
        break;
      case 'hour':
        now.setHours(now.getHours() - value);
        break;
      case 'day':
        now.setDate(now.getDate() - value);
        break;
      case 'week':
        now.setDate(now.getDate() - value * 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - value);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() - value);
        break;
    }

    return now;
  }

  /**
   * Parse view count string to number
   */
  private parseViewCount(viewStr: string): number {
    if (!viewStr) return 0;

    const match = viewStr.match(/([\d,.]+)\s*(K|M|B)?/i);
    if (!match) return 0;

    let value = parseFloat(match[1].replace(/,/g, ''));
    const suffix = match[2]?.toUpperCase();

    switch (suffix) {
      case 'K':
        value *= 1000;
        break;
      case 'M':
        value *= 1000000;
        break;
      case 'B':
        value *= 1000000000;
        break;
    }

    return Math.round(value);
  }
}

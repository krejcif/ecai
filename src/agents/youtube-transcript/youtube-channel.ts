/**
 * YouTube Channel Service
 * Fetches video list from a YouTube channel using RSS feed or YouTube Data API
 */

import axios from 'axios';
import { YouTubeVideo } from './types';
import { logger } from '../../utils';

export class YouTubeChannelService {
  private channelUrl: string;
  private channelId: string | null = null;
  private channelTitle: string = '';
  private apiKey: string | null = null;

  constructor(channelUrl: string, apiKey?: string) {
    this.channelUrl = channelUrl;
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY || null;
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
   * Get channel ID from handle using oembed or page parsing
   */
  private async resolveChannelId(parsed: { type: string; value: string }): Promise<string> {
    if (parsed.type === 'id') {
      return parsed.value;
    }

    logger.info('Resolving channel ID from handle...', { handle: parsed.value });

    // Try using a public API to get channel info
    try {
      // Method 1: Use Invidious API (public YouTube proxy)
      const invidiousInstances = [
        'https://vid.puffyan.us',
        'https://invidious.snopyta.org',
        'https://invidious.kavin.rocks',
      ];

      for (const instance of invidiousInstances) {
        try {
          const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(parsed.value)}&type=channel`;
          const response = await axios.get(searchUrl, { timeout: 10000 });

          if (response.data && response.data.length > 0) {
            const channel = response.data[0];
            this.channelId = channel.authorId;
            this.channelTitle = channel.author;
            logger.info('Resolved channel ID via Invidious', { channelId: this.channelId });
            return this.channelId;
          }
        } catch {
          // Try next instance
          continue;
        }
      }
    } catch (error) {
      logger.warn('Invidious API failed, trying alternative method');
    }

    // Method 2: Use a known channel ID mapping for popular channels
    const knownChannels: Record<string, { id: string; title: string }> = {
      'aidotengineer': { id: 'UCvjgXvBlFQM1Z5dDMgZhHVg', title: 'AI Dot Engineer' },
      // Add more known channels as needed
    };

    const knownChannel = knownChannels[parsed.value.toLowerCase()];
    if (knownChannel) {
      this.channelId = knownChannel.id;
      this.channelTitle = knownChannel.title;
      logger.info('Using known channel ID mapping', { channelId: this.channelId });
      return this.channelId;
    }

    // Method 3: Try direct channel ID guess (handles often have matching IDs)
    // This is a fallback - may not always work
    throw new Error(`Could not resolve channel ID for handle: ${parsed.value}. Please provide the channel ID directly (format: /channel/UC...)`);
  }

  /**
   * Fetch latest videos - uses API if available, falls back to RSS
   */
  async getLatestVideos(maxVideos: number = 10): Promise<YouTubeVideo[]> {
    const parsed = this.parseChannelUrl();
    logger.info('Fetching videos from YouTube channel', { type: parsed.type, value: parsed.value });

    // If API key is available, use YouTube Data API
    if (this.apiKey) {
      return this.getVideosViaApi(parsed, maxVideos);
    }

    // Fallback to RSS feed
    return this.getVideosViaRss(parsed, maxVideos);
  }

  /**
   * Fetch videos using YouTube Data API
   */
  private async getVideosViaApi(
    parsed: { type: string; value: string },
    maxVideos: number
  ): Promise<YouTubeVideo[]> {
    logger.info('Using YouTube Data API');

    try {
      let channelId: string;

      // Get channel ID from handle if needed
      if (parsed.type !== 'id') {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(parsed.value)}&key=${this.apiKey}`;
        const searchResponse = await axios.get(searchUrl, { timeout: 10000 });

        if (searchResponse.data.items && searchResponse.data.items.length > 0) {
          channelId = searchResponse.data.items[0].id.channelId;
          this.channelTitle = searchResponse.data.items[0].snippet.title;
        } else {
          throw new Error(`Channel not found: ${parsed.value}`);
        }
      } else {
        channelId = parsed.value;
      }

      this.channelId = channelId;

      // Get channel's upload playlist
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&id=${channelId}&key=${this.apiKey}`;
      const channelResponse = await axios.get(channelUrl, { timeout: 10000 });

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;
      this.channelTitle = channelResponse.data.items[0].snippet.title;

      // Get videos from uploads playlist
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxVideos}&key=${this.apiKey}`;
      const playlistResponse = await axios.get(playlistUrl, { timeout: 10000 });

      const videos: YouTubeVideo[] = playlistResponse.data.items.map((item: Record<string, unknown>) => {
        const snippet = item.snippet as Record<string, unknown>;
        const thumbnails = snippet.thumbnails as Record<string, Record<string, string>>;

        return {
          id: (item.contentDetails as Record<string, string>).videoId,
          title: snippet.title as string,
          description: (snippet.description as string || '').slice(0, 500),
          publishedAt: new Date(snippet.publishedAt as string),
          thumbnailUrl: thumbnails?.high?.url || thumbnails?.default?.url || '',
          channelId: snippet.channelId as string,
          channelTitle: snippet.channelTitle as string,
        };
      });

      logger.info(`Found ${videos.length} videos via API`);
      return videos;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`YouTube API request failed: ${errorMessage}`);
      throw new Error(`YouTube API failed: ${errorMessage}`);
    }
  }

  /**
   * Fetch videos using RSS feed
   */
  private async getVideosViaRss(
    parsed: { type: string; value: string },
    maxVideos: number
  ): Promise<YouTubeVideo[]> {
    try {
      const channelId = await this.resolveChannelId(parsed);

      // Use YouTube RSS feed - this is publicly accessible
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

      const response = await axios.get(rssUrl, {
        headers: {
          'Accept': 'application/xml, text/xml, application/rss+xml',
        },
        timeout: 30000,
      });

      const xml = response.data as string;
      const videos = this.parseRssFeed(xml, maxVideos);

      logger.info(`Found ${videos.length} videos from channel`);
      return videos;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to fetch YouTube channel videos: ${errorMessage}`);
      throw new Error(`Failed to fetch YouTube channel: ${errorMessage}`);
    }
  }

  /**
   * Parse YouTube RSS feed XML
   */
  private parseRssFeed(xml: string, maxVideos: number): YouTubeVideo[] {
    const videos: YouTubeVideo[] = [];

    // Extract channel title
    const channelTitleMatch = xml.match(/<title>([^<]+)<\/title>/);
    if (channelTitleMatch && !this.channelTitle) {
      this.channelTitle = channelTitleMatch[1];
    }

    // Extract entries (videos)
    const entryPattern = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryPattern.exec(xml)) !== null && videos.length < maxVideos) {
      const entry = match[1];

      // Extract video ID
      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      if (!videoIdMatch) continue;

      const videoId = videoIdMatch[1];

      // Extract title
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch ? this.decodeXmlEntities(titleMatch[1]) : 'Unknown Title';

      // Extract published date
      const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
      const publishedAt = publishedMatch ? new Date(publishedMatch[1]) : new Date();

      // Extract description (media:description)
      const descMatch = entry.match(/<media:description>([^<]*)<\/media:description>/);
      const description = descMatch ? this.decodeXmlEntities(descMatch[1]) : '';

      // Extract thumbnail
      const thumbMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/);
      const thumbnailUrl = thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      // Extract view count
      const viewsMatch = entry.match(/<media:statistics[^>]*views="(\d+)"/);
      const viewCount = viewsMatch ? parseInt(viewsMatch[1], 10) : 0;

      videos.push({
        id: videoId,
        title,
        description,
        publishedAt,
        thumbnailUrl,
        channelId: this.channelId || '',
        channelTitle: this.channelTitle,
        viewCount,
      });
    }

    return videos;
  }

  /**
   * Decode XML entities
   */
  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  /**
   * Get channel title
   */
  getChannelTitle(): string {
    return this.channelTitle;
  }
}

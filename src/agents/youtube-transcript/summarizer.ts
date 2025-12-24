/**
 * AI Summarizer Service
 * Creates summaries from video transcripts using AI models
 */

import axios from 'axios';
import { VideoTranscript, VideoSummary, YouTubeVideo } from './types';
import { logger } from '../../utils';
import { TranscriptExtractor } from './transcript-extractor';

export interface SummarizerConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey: string;
  model: string;
  maxTokens?: number;
}

export class Summarizer {
  private config: SummarizerConfig;
  private transcriptExtractor: TranscriptExtractor;

  constructor(config: SummarizerConfig) {
    this.config = {
      ...config,
      maxTokens: config.maxTokens || 1500,
    };
    this.transcriptExtractor = new TranscriptExtractor();
  }

  /**
   * Create a summary from a video transcript
   */
  async summarize(video: YouTubeVideo, transcript: VideoTranscript): Promise<VideoSummary> {
    logger.info(`Summarizing video: ${video.title}`);

    const cleanedText = this.transcriptExtractor.cleanTranscript(transcript.fullText);

    // If transcript is too long, summarize in chunks
    let summaryText: string;
    let keyPoints: string[];
    let topics: string[];

    if (cleanedText.length > 12000) {
      const result = await this.summarizeLongTranscript(cleanedText, video.title);
      summaryText = result.summary;
      keyPoints = result.keyPoints;
      topics = result.topics;
    } else {
      const result = await this.summarizeWithAI(cleanedText, video.title);
      summaryText = result.summary;
      keyPoints = result.keyPoints;
      topics = result.topics;
    }

    return {
      videoId: video.id,
      videoTitle: video.title,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      publishedAt: video.publishedAt,
      summary: summaryText,
      keyPoints,
      topics,
      duration: video.duration,
    };
  }

  /**
   * Summarize a long transcript by processing in chunks
   */
  private async summarizeLongTranscript(
    text: string,
    videoTitle: string
  ): Promise<{ summary: string; keyPoints: string[]; topics: string[] }> {
    const chunks = this.transcriptExtractor.splitIntoChunks(text, 6000);
    const chunkSummaries: string[] = [];

    logger.info(`Processing long transcript in ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const chunkSummary = await this.summarizeChunk(chunks[i], i + 1, chunks.length);
      chunkSummaries.push(chunkSummary);
      await this.delay(500); // Rate limiting
    }

    // Final summary from chunk summaries
    const combinedSummaries = chunkSummaries.join('\n\n');
    return this.summarizeWithAI(combinedSummaries, videoTitle, true);
  }

  /**
   * Summarize a single chunk of text
   */
  private async summarizeChunk(chunk: string, chunkNum: number, totalChunks: number): Promise<string> {
    const prompt = `Summarize this section (part ${chunkNum}/${totalChunks}) of a video transcript in 2-3 sentences. Focus on the main points discussed:\n\n${chunk}`;

    return this.callAI(prompt, 500);
  }

  /**
   * Generate full summary with AI
   */
  private async summarizeWithAI(
    text: string,
    videoTitle: string,
    isChunkSummary: boolean = false
  ): Promise<{ summary: string; keyPoints: string[]; topics: string[] }> {
    const systemPrompt = `You are an expert at summarizing YouTube video content. Create clear, informative summaries that capture the essence of the video.`;

    const userPrompt = isChunkSummary
      ? `Based on these section summaries from the video "${videoTitle}", create a comprehensive summary.

Section summaries:
${text}

Please provide:
1. A 3-5 sentence summary of the entire video
2. 5-7 key points (bullet points)
3. 3-5 main topics/themes discussed

Format your response as JSON:
{
  "summary": "...",
  "keyPoints": ["point1", "point2", ...],
  "topics": ["topic1", "topic2", ...]
}`
      : `Summarize this video transcript from "${videoTitle}":

${text}

Please provide:
1. A 3-5 sentence summary of the video
2. 5-7 key points (bullet points)
3. 3-5 main topics/themes discussed

Format your response as JSON:
{
  "summary": "...",
  "keyPoints": ["point1", "point2", ...],
  "topics": ["topic1", "topic2", ...]
}`;

    const response = await this.callAI(userPrompt, this.config.maxTokens!, systemPrompt);

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          summary: string;
          keyPoints: string[];
          topics: string[];
        };
        return {
          summary: parsed.summary || 'Summary not available',
          keyPoints: parsed.keyPoints || [],
          topics: parsed.topics || [],
        };
      }
    } catch (parseError) {
      logger.warn('Failed to parse AI response as JSON, using fallback parsing');
    }

    // Fallback: extract information manually
    return {
      summary: response.slice(0, 500),
      keyPoints: this.extractBulletPoints(response),
      topics: [],
    };
  }

  /**
   * Call the AI provider API
   */
  private async callAI(prompt: string, maxTokens: number, systemPrompt?: string): Promise<string> {
    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(prompt, maxTokens, systemPrompt);
      case 'anthropic':
        return this.callAnthropic(prompt, maxTokens, systemPrompt);
      case 'local':
        return this.callLocalModel(prompt, maxTokens, systemPrompt);
      default:
        throw new Error(`Unknown AI provider: ${this.config.provider}`);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string, maxTokens: number, systemPrompt?: string): Promise<string> {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.config.model || 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(prompt: string, maxTokens: number, systemPrompt?: string): Promise<string> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.config.model || 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        system: systemPrompt || 'You are a helpful assistant that summarizes video content.',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        timeout: 60000,
      }
    );

    return response.data.content[0].text;
  }

  /**
   * Call local model (e.g., Ollama)
   */
  private async callLocalModel(prompt: string, _maxTokens: number, systemPrompt?: string): Promise<string> {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await axios.post(
      'http://localhost:11434/api/generate',
      {
        model: this.config.model || 'llama2',
        prompt: fullPrompt,
        stream: false,
      },
      {
        timeout: 120000,
      }
    );

    return response.data.response;
  }

  /**
   * Extract bullet points from text
   */
  private extractBulletPoints(text: string): string[] {
    const bulletPattern = /^[\s]*[-•*]\s*(.+)$/gm;
    const points: string[] = [];
    let match;

    while ((match = bulletPattern.exec(text)) !== null) {
      points.push(match[1].trim());
    }

    return points.slice(0, 7); // Max 7 points
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

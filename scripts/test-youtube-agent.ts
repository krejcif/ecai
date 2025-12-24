#!/usr/bin/env tsx
/**
 * Test script for YouTube Transcript Email Agent components
 */

import 'dotenv/config';
import chalk from 'chalk';
import { TranscriptExtractor } from '../src/agents/youtube-transcript/transcript-extractor';
import { YouTubeVideo } from '../src/agents/youtube-transcript/types';

async function test() {
  console.log(chalk.bold.blue('\n🧪 Testing YouTube Transcript Agent Components\n'));

  // Test with a known public video that has captions
  // Using a TED talk which typically has good transcripts
  const testVideo: YouTubeVideo = {
    id: 'UF8uR6Z6KLc', // Steve Jobs Stanford speech - has captions
    title: 'Steve Jobs Stanford Commencement Speech 2005',
    description: 'Test video',
    publishedAt: new Date(),
    thumbnailUrl: 'https://i.ytimg.com/vi/UF8uR6Z6KLc/hqdefault.jpg',
    channelId: '',
    channelTitle: 'Stanford',
  };

  console.log(chalk.cyan('1. Testing Transcript Extractor...'));
  console.log(chalk.gray(`   Video: ${testVideo.title}`));
  console.log(chalk.gray(`   URL: https://youtube.com/watch?v=${testVideo.id}`));

  const extractor = new TranscriptExtractor('en');

  try {
    const transcript = await extractor.getTranscript(testVideo);

    if (transcript) {
      console.log(chalk.green(`   ✅ Got transcript successfully!`));
      console.log(chalk.gray(`   Segments: ${transcript.segments.length}`));
      console.log(chalk.gray(`   Total text length: ${transcript.fullText.length} characters`));
      console.log(chalk.gray(`   Language: ${transcript.language}`));
      console.log(chalk.cyan('\n   Preview (first 300 chars):'));
      console.log(chalk.white(`   "${transcript.fullText.slice(0, 300)}..."`));

      console.log(chalk.bold.green('\n✅ Transcript extraction works!\n'));
    } else {
      console.log(chalk.yellow(`   ⚠️ No transcript available for this video`));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(chalk.red(`   ❌ Error: ${errorMessage}`));
  }

  // Info about channel fetching limitation
  console.log(chalk.yellow('\n⚠️  Note about YouTube Channel Fetching:'));
  console.log(chalk.gray('   YouTube blocks server-side requests to channel pages.'));
  console.log(chalk.gray('   To use this agent, you need to either:'));
  console.log(chalk.gray('   1. Run it from a machine with browser-like access'));
  console.log(chalk.gray('   2. Use YouTube Data API (set YOUTUBE_API_KEY)'));
  console.log(chalk.gray('   3. Provide video IDs directly\n'));

  console.log(chalk.cyan('To run the full agent with your own setup:'));
  console.log(chalk.gray('   1. Copy .env.example to .env'));
  console.log(chalk.gray('   2. Set your ANTHROPIC_API_KEY or OPENAI_API_KEY'));
  console.log(chalk.gray('   3. Configure SMTP settings for email'));
  console.log(chalk.gray('   4. Run: npm run youtube-agent -- --channel "URL"\n'));
}

test();

#!/usr/bin/env tsx
/**
 * YouTube Transcript Email Agent CLI
 *
 * Fetches transcripts from a YouTube channel, generates summaries using AI,
 * and sends them via email.
 *
 * Usage:
 *   npx tsx scripts/youtube-transcript-agent.ts [options]
 *
 * Options:
 *   --channel <url>     YouTube channel URL (required)
 *   --max-videos <n>    Maximum number of videos to process (default: 5)
 *   --language <code>   Transcript language (default: en)
 *   --watch             Run in watch mode (continuous monitoring)
 *   --interval <min>    Check interval in minutes for watch mode (default: 60)
 *   --clear-history     Clear processed videos history and exit
 *   --dry-run           Process videos but don't send email
 *
 * Environment variables:
 *   AI_PROVIDER         openai, anthropic, or local (default: anthropic)
 *   OPENAI_API_KEY      OpenAI API key
 *   ANTHROPIC_API_KEY   Anthropic API key
 *   AI_MODEL            AI model to use
 *   SMTP_HOST           SMTP server host
 *   SMTP_PORT           SMTP server port
 *   SMTP_SECURE         Use TLS (true/false)
 *   SMTP_USER           SMTP username
 *   SMTP_PASS           SMTP password
 *   EMAIL_FROM          Sender email address
 *   EMAIL_TO            Recipient email addresses (comma-separated)
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { YouTubeTranscriptEmailAgent, AgentConfig } from '../src/agents/youtube-transcript';
import { logger } from '../src/utils';

const program = new Command();

program
  .name('youtube-transcript-agent')
  .description('Fetch YouTube video transcripts, summarize them, and send via email')
  .version('1.0.0')
  .requiredOption('-c, --channel <url>', 'YouTube channel URL')
  .option('-n, --max-videos <number>', 'Maximum number of videos to process', '5')
  .option('-l, --language <code>', 'Transcript language', 'en')
  .option('-w, --watch', 'Run in watch mode (continuous monitoring)')
  .option('-i, --interval <minutes>', 'Check interval in minutes for watch mode', '60')
  .option('--clear-history', 'Clear processed videos history and exit')
  .option('--dry-run', 'Process videos but don\'t send email')
  .action(async (options) => {
    console.log(chalk.bold.blue('\n📺 YouTube Transcript Email Agent\n'));

    // Validate environment variables
    const aiProvider = (process.env.AI_PROVIDER || 'anthropic') as 'openai' | 'anthropic' | 'local';
    const apiKey = aiProvider === 'openai'
      ? process.env.OPENAI_API_KEY
      : process.env.ANTHROPIC_API_KEY;

    if (aiProvider !== 'local' && !apiKey) {
      console.error(chalk.red(`❌ Missing API key for ${aiProvider}. Set ${aiProvider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} environment variable.`));
      process.exit(1);
    }

    if (!options.dryRun) {
      const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM', 'EMAIL_TO'];
      const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

      if (missingVars.length > 0) {
        console.error(chalk.red(`❌ Missing required environment variables: ${missingVars.join(', ')}`));
        console.log(chalk.yellow('\nSet the following environment variables in your .env file:'));
        console.log(chalk.gray(`
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=your-email@example.com
  SMTP_PASS=your-password
  EMAIL_FROM="YouTube Agent <noreply@example.com>"
  EMAIL_TO=recipient@example.com
        `));
        process.exit(1);
      }
    }

    // Build agent configuration
    const config: AgentConfig = {
      channelUrl: options.channel,
      maxVideos: parseInt(options.maxVideos, 10),
      language: options.language,
      aiProvider,
      aiModel: process.env.AI_MODEL || (aiProvider === 'anthropic' ? 'claude-3-haiku-20240307' : 'gpt-4o-mini'),
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      checkInterval: parseInt(options.interval, 10),
      email: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
        from: process.env.EMAIL_FROM || '',
        to: (process.env.EMAIL_TO || '').split(',').map((e) => e.trim()).filter(Boolean),
      },
    };

    // Create agent instance
    const agent = new YouTubeTranscriptEmailAgent(config);

    // Handle clear history option
    if (options.clearHistory) {
      const spinner = ora('Clearing processed videos history...').start();
      agent.clearHistory();
      spinner.succeed('History cleared');
      process.exit(0);
    }

    // Display configuration
    console.log(chalk.cyan('Configuration:'));
    console.log(chalk.gray(`  Channel: ${options.channel}`));
    console.log(chalk.gray(`  Max videos: ${options.maxVideos}`));
    console.log(chalk.gray(`  Language: ${options.language}`));
    console.log(chalk.gray(`  AI Provider: ${aiProvider}`));
    console.log(chalk.gray(`  AI Model: ${config.aiModel}`));
    if (!options.dryRun) {
      console.log(chalk.gray(`  Email to: ${config.email.to.join(', ')}`));
    }
    if (options.watch) {
      console.log(chalk.gray(`  Watch mode: enabled (every ${options.interval} minutes)`));
    }
    console.log('');

    // Set up event listeners
    const spinner = ora('Starting agent...').start();

    agent.on('progress', ({ phase, message }) => {
      spinner.text = message;
    });

    agent.on('error', ({ error }) => {
      spinner.fail(chalk.red(`Error: ${error}`));
    });

    agent.on('complete', ({ summaries, emailSent }) => {
      if (summaries > 0) {
        spinner.succeed(chalk.green(`Processed ${summaries} videos${emailSent ? ' and sent email' : ''}`));
      } else {
        spinner.info('No new videos to process');
      }
    });

    try {
      if (options.watch) {
        spinner.info('Starting watch mode...');
        await agent.runWatchMode();
      } else {
        const result = await agent.run();

        console.log('');
        console.log(chalk.bold('Results:'));
        console.log(chalk.gray(`  Processed videos: ${result.processedVideos}`));
        console.log(chalk.gray(`  Email sent: ${result.emailSent ? chalk.green('Yes') : chalk.yellow('No')}`));

        if (result.errors.length > 0) {
          console.log(chalk.red(`  Errors: ${result.errors.length}`));
          result.errors.forEach((err) => {
            console.log(chalk.red(`    - ${err}`));
          });
        }

        if (result.summaries.length > 0) {
          console.log('');
          console.log(chalk.bold('Summaries:'));
          result.summaries.forEach((summary, i) => {
            console.log(chalk.cyan(`\n${i + 1}. ${summary.videoTitle}`));
            console.log(chalk.gray(`   ${summary.videoUrl}`));
            console.log(chalk.white(`   ${summary.summary.slice(0, 200)}...`));
          });
        }

        process.exit(result.success ? 0 : 1);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      spinner.fail(chalk.red(`Agent failed: ${errorMessage}`));
      logger.error(`Agent failed: ${errorMessage}`);
      process.exit(1);
    }
  });

program.parse();

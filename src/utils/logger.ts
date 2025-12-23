/**
 * Logging Utility
 *
 * Provides colored console output, log levels, file logging, and structured logging
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { LogLevel, LogEntry, LogConfig } from '../types';

// ===== Log Level Priorities =====

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ===== Color Mapping =====

const LOG_COLORS: Record<LogLevel, 'gray' | 'blue' | 'yellow' | 'red'> = {
  debug: 'gray',
  info: 'blue',
  warn: 'yellow',
  error: 'red',
};

const LOG_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
};

// ===== Logger Class =====

export class Logger {
  private config: LogConfig;
  private logFile?: string;
  private writeStream?: fs.WriteStream;

  constructor(config: Partial<LogConfig> = {}) {
    this.config = {
      level: config.level || 'info',
      console: config.console !== false,
      structured: config.structured || false,
      colorize: config.colorize !== false,
      file: config.file,
    };

    if (this.config.file) {
      this.initializeFileLogging(this.config.file);
    }
  }

  /**
   * Initialize file logging
   */
  private initializeFileLogging(filePath: string): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.logFile = filePath;
      this.writeStream = fs.createWriteStream(filePath, { flags: 'a' });
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  /**
   * Format log message
   */
  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const icon = LOG_ICONS[entry.level];

    if (this.config.structured) {
      return JSON.stringify({
        timestamp,
        level: entry.level,
        message: entry.message,
        context: entry.context,
        error: entry.error
          ? {
              message: entry.error.message,
              stack: entry.error.stack,
            }
          : undefined,
      });
    }

    let message = `[${timestamp}] ${level} ${icon} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return message;
  }

  /**
   * Colorize message for console
   */
  private colorize(message: string, level: LogLevel): string {
    if (!this.config.colorize) {
      return message;
    }

    const color = LOG_COLORS[level];
    switch (color) {
      case 'gray':
        return chalk.gray(message);
      case 'blue':
        return chalk.blue(message);
      case 'yellow':
        return chalk.yellow(message);
      case 'red':
        return chalk.red(message);
      default:
        return message;
    }
  }

  /**
   * Write log entry
   */
  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const message = this.formatMessage(entry);

    // Console output
    if (this.config.console) {
      const coloredMessage = this.colorize(message, entry.level);
      console.log(coloredMessage);
    }

    // File output
    if (this.writeStream) {
      this.writeStream.write(message + '\n');
    }
  }

  /**
   * Debug log
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.write({
      level: 'debug',
      message,
      timestamp: new Date(),
      context,
    });
  }

  /**
   * Info log
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.write({
      level: 'info',
      message,
      timestamp: new Date(),
      context,
    });
  }

  /**
   * Warning log
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.write({
      level: 'warn',
      message,
      timestamp: new Date(),
      context,
    });
  }

  /**
   * Error log
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.write({
      level: 'error',
      message,
      timestamp: new Date(),
      error,
      context,
    });
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    this.write({
      level,
      message,
      timestamp: new Date(),
      context,
    });
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.file && config.file !== this.logFile) {
      this.close();
      this.initializeFileLogging(config.file);
    }
  }

  /**
   * Close file stream
   */
  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = undefined;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): ContextLogger {
    return new ContextLogger(this, context);
  }
}

// ===== Context Logger =====

class ContextLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, unknown>
  ) {}

  debug(message: string, additionalContext?: Record<string, unknown>): void {
    this.parent.debug(message, { ...this.context, ...additionalContext });
  }

  info(message: string, additionalContext?: Record<string, unknown>): void {
    this.parent.info(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: Record<string, unknown>): void {
    this.parent.warn(message, { ...this.context, ...additionalContext });
  }

  error(message: string, error?: Error, additionalContext?: Record<string, unknown>): void {
    this.parent.error(message, error, { ...this.context, ...additionalContext });
  }

  log(level: LogLevel, message: string, additionalContext?: Record<string, unknown>): void {
    this.parent.log(level, message, { ...this.context, ...additionalContext });
  }
}

// ===== Default Logger Instance =====

export const logger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  console: process.env.LOG_CONSOLE !== 'false',
  structured: process.env.LOG_STRUCTURED === 'true',
  colorize: process.env.LOG_COLORIZE !== 'false',
  file: process.env.LOG_FILE,
});

// ===== Exports =====

export default logger;

// ===== Utility Functions =====

/**
 * Create a logger with specific configuration
 */
export function createLogger(config: Partial<LogConfig>): Logger {
  return new Logger(config);
}

/**
 * Format error for logging
 */
export function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Create a performance timer logger
 */
export function createTimer(logger: Logger, label: string): () => void {
  const start = Date.now();

  return () => {
    const duration = Date.now() - start;
    logger.debug(`${label} completed in ${duration}ms`, { duration });
  };
}

/**
 * Log with timing
 */
export async function logTimed<T>(
  logger: Logger,
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  logger.debug(`${label} started`);

  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.debug(`${label} completed in ${duration}ms`, { duration });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`${label} failed after ${duration}ms`, error as Error, { duration });
    throw error;
  }
}

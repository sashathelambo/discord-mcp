export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private enableLogging: boolean;

  private constructor() {
    this.enableLogging = process.env.ENABLE_LOGGING === 'true';
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL);
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private parseLogLevel(level?: string): LogLevel {
    switch (level?.toUpperCase()) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enableLogging && level <= this.logLevel;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] DiscordMCP: ${message}`;
  }

  error(message: string, error?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message));
      if (error) {
        console.error(error);
      }
    }
  }

  warn(message: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message));
    }
  }

  info(message: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message));
    }
  }

  debug(message: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message));
    }
  }

  logOperation(operation: string, details?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const detailStr = details ? ` ${JSON.stringify(details)}` : '';
      this.info(`Operation: ${operation}${detailStr}`);
    }
  }

  logError(operation: string, error: any): void {
    this.error(`Operation failed: ${operation}`, error);
  }
}
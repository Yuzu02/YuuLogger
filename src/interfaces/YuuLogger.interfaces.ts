import { ModuleMetadata, Type } from "@nestjs/common";

/**
 * Available log levels
 */
export type LogLevel = "error" | "warn" | "info" | "verbose" | "debug";

/**
 * Available themes for the logger
 */
export type LoggerTheme =
  | "default"
  | "dark"
  | "light"
  | "colorful"
  | "minimal"
  | "pastel"
  | "ocean"
  | "sunset"
  | "forest"
  | "cyberpunk"
  | "coffee"
  | "royal"
  | "midnight"
  | "candy"
  | "highContrast"
  | "matrix";

/**
 * Sampling options to control the amount of logs
 *
 * These options allow reducing the number of logs in high-load environments
 * by applying sampling rates to different types of logs
 */
export interface SamplingOptions {
  /**
   * Sampling rate for general logs (0.0 - 1.0)
   * Example: 0.1 means that only approximately 10% of logs will be recorded
   * @default 1.0 (100%, no sampling)
   */
  generalSamplingRate?: number;

  /**
   * Sampling rate for performance profile logs
   * @default 1.0 (100%, no sampling)
   */
  profileSamplingRate?: number;

  /**
   * If true, sampling will never be applied to error logs
   * @default true
   */
  alwaysLogErrors?: boolean;
}

/**
 * Configuration options for YuuLogModule
 */
export interface YuuLogOptions {
  /**
   * Application name that will appear in the logs
   * @default "NestJS"
   */
  appName?: string;

  /**
   * Enabled log levels
   * @default ["error", "warn", "info"]
   */
  logLevels?: LogLevel[];

  /**
   * Visual theme for console logs
   * @default "default"
   */
  loggerTheme?: LoggerTheme;

  /**
   * Enable file logging
   * @default false
   */
  enableFileLogging?: boolean;

  /**
   * Logtail configuration, if needed
   */
  logtail?: {
    /**
     * Logtail token
     */
    sourceToken: string;

    /**
     * Logtail endpoint
     */
    endpoint: string;

    /**
     * Enable sending logs to Logtail
     */
    enabled: boolean;
  };

  /**
   * Sampling options to control the amount of logs in high-load environments
   */
  sampling?: SamplingOptions;
}

/**
 * Factory for async module options
 */
export interface YuuLogOptionsFactory {
  createYuuLogOptions(): Promise<YuuLogOptions> | YuuLogOptions;
}

/**
 * Options for async module configuration
 */
export interface YuuLogAsyncOptions extends Pick<ModuleMetadata, "imports"> {
  /**
   * Class that will be injected and used to get the configuration
   */
  useClass?: Type<YuuLogOptionsFactory>;

  /**
   * Factory function that returns the configuration
   */
  useFactory?: (...args: unknown[]) => Promise<YuuLogOptions> | YuuLogOptions;

  /**
   * Dependencies that will be injected into the factory
   */
  inject?: (Type<unknown> | string | symbol)[];

  /**
   * Existing token to provide the configuration
   */
  useExisting?: Type<YuuLogOptionsFactory>;
}

/**
 * Interface for structured logs with standardized fields
 *
 * This interface helps maintain a consistent format for logs
 * that facilitates their processing and automated analysis
 */
export interface StructuredLogEntry {
  /**
   * Log level (error, warn, info, etc)
   */
  level: LogLevel;

  /**
   * Main log message
   */
  message: string;

  /**
   * Context (normally the class or service name)
   */
  context?: string;

  /**
   * ISO timestamp
   */
  timestamp: string;

  /**
   * Additional data organized by categories
   */
  data?: {
    /**
     * User information (id, email, roles, etc.)
     */
    user?: Record<string, unknown>;

    /**
     * HTTP request information (method, path, query, etc.)
     */
    request?: Record<string, unknown>;

    /**
     * HTTP response information (statusCode, contentLength, etc.)
     */
    response?: Record<string, unknown>;

    /**
     * Error information (message, stack, code, etc.)
     */
    error?: Record<string, unknown>;

    /**
     * Performance information (duration, memory, etc.)
     */
    performance?: Record<string, unknown>;

    /**
     * Other custom metadata
     */
    [key: string]: unknown;
  };

  /**
   * Any additional metadata that doesn't fit into standard categories
   */
  [key: string]: unknown;
}

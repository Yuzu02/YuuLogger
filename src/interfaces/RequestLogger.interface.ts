/**
 * Options for the logging middleware
 */
export interface RequestLoggerOptions {
  /**
   * Paths to exclude from logging
   */
  excludePaths?: string[];

  /**
   * If true, logs basic information for all routes
   * @default true
   */
  logAllRequests?: boolean;

  /**
   * If true, includes authenticated user information in logs
   * (requires req.user to be available)
   * @default false
   */
  includeUserInfo?: boolean;

  /**
   * Log level to use
   * @default "info"
   */
  logLevel?: "debug" | "info" | "warn" | "error";

  /**
   * If true, includes detailed execution time information
   * @default false
   */
  includeTiming?: boolean;

  /**
   * Percentage of requests to log (0.0 - 1.0)
   * Useful to reduce the amount of logs in high-traffic applications
   * @default 1.0 (all requests)
   */
  sampleRate?: number;
}

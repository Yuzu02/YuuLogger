/**
 * Options for the HTTP logger interceptor
 */
export interface HttpLoggerOptions {
  /**
   * If true, all requests will be logged
   * @default true
   */
  logAllRequests?: boolean;

  /**
   * If true, only requests with errors will be logged
   * @default true
   */
  logErrors?: boolean;

  /**
   * If true, request headers will be logged
   * @default false
   */
  logRequestHeaders?: boolean;

  /**
   * If true, response headers will be logged
   * @default false
   */
  logResponseHeaders?: boolean;

  /**
   * List of paths that will be excluded from logs
   * @example ['/health', '/metrics']
   * @default []
   */
  excludePaths?: string[];

  /**
   * If true, a correlation ID will be assigned to each request
   * @default true
   */
  enableCorrelationId?: boolean;

  /**
   * Header name for the correlation ID
   * @default 'X-Correlation-ID'
   */
  correlationIdHeader?: string;
}

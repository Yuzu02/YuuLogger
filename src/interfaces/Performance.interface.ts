/**
 * Configuration options for the PerformanceInterceptor
 *
 * These options determine what data is collected and included in the performance profile.
 */
export interface PerformanceInterceptorOptions {
  /**
   * Operation name to identify this performance measurement
   *
   * This will be displayed in logs and can help identify specific endpoints or handlers
   */
  operationName?: string;

  /**
   * Whether to include request details in the profiling metadata
   *
   * When enabled, information about the HTTP request will be included in the profile
   * @default true
   */
  includeRequestDetails?: boolean;

  /**
   * Whether to include response details in the profiling metadata
   *
   * When enabled, information about the HTTP response will be included in the profile
   * @default true
   */
  includeResponseDetails?: boolean;

  /**
   * Whether to include query parameters in request details
   *
   * @default true
   */
  includeQueryParams?: boolean;

  /**
   * Whether to include request body in request details
   *
   * This can be useful for debugging but may log sensitive information
   * @default false
   */
  includeRequestBody?: boolean;

  /**
   * Whether to include response body in response details
   *
   * Note: This can impact performance for large responses and may log sensitive information
   * @default false
   */
  includeResponseBody?: boolean;

  /**
   * Additional metadata to include with the profile
   *
   * Custom data that will be included in the performance profile
   */
  metadata?: Record<string, unknown>;
}

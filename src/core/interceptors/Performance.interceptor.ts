import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { RequestType, ResponseType } from "../../interfaces/Http.interface";
import { PerformanceInterceptorOptions } from "../../interfaces/Performance.interface";
import { YuuLogService } from "../../services/YuuLogger.service";

/**
 * Default configuration for the PerformanceInterceptor
 */
const DEFAULT_OPTIONS: PerformanceInterceptorOptions = {
  includeRequestDetails: true,
  includeResponseDetails: true,
  includeQueryParams: true,
  includeRequestBody: false,
  includeResponseBody: false,
};

/**
 * Interceptor for measuring the performance of NestJS controllers and handlers
 *
 * This interceptor provides detailed performance metrics for HTTP requests, including:
 * - Request processing time
 * - Memory usage
 * - Request and response details (configurable)
 *
 * It integrates with the LoggerService to provide consistent profiling across your application.
 *
 * @example
 * // Apply to all endpoints in a controller
 * @UseInterceptors(PerformanceInterceptor)
 * @Controller('users')
 * export class UsersController {}
 *
 * @example
 * // Apply to a specific endpoint with custom options
 * @UseInterceptors(new PerformanceInterceptor({
 *   operationName: 'List Users',
 *   includeRequestBody: true
 * }))
 * @Get()
 * findAll() {}
 *
 * @example
 * // Apply globally to all controllers in your application
 * // In your app.module.ts:
 * providers: [
 *   {
 *     provide: APP_INTERCEPTOR,
 *     useClass: PerformanceInterceptor
 *   }
 * ]
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = YuuLogService.getLogger();
  private readonly options: PerformanceInterceptorOptions;

  /**
   * Creates a new instance of the PerformanceInterceptor
   *
   * @param options - Configuration options for the interceptor
   */
  constructor(options: PerformanceInterceptorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Intercept method that wraps the request handler
   *
   * This method is called for each request that passes through the interceptor.
   * It collects performance metrics before and after the request is processed.
   *
   * @param context - The execution context of the current request
   * @param next - The next handler in the request pipeline
   * @returns An observable that will emit the response when complete
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Skip if not an HTTP request
    if (context.getType() !== "http") {
      return next.handle();
    }

    // Get HTTP context
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestType>();
    const response = httpContext.getResponse<ResponseType>();

    // Extract request info safely for both Express and Fastify
    const method = request.method;
    const url = request.originalUrl || request.url || "";
    const route =
      request.path ||
      (request as { route?: { path: string } }).route?.path ||
      url.split("?")[0];
    const params = request.params || {};
    const query = request.query || {};
    const body = request.body;

    // Get handler information
    const handler = context.getHandler().name;
    const controller = context.getClass().name;

    // Create operation name if not provided
    const operationName =
      this.options.operationName || `${controller}.${handler}`;

    // Collect request metadata
    const metadata: Record<string, unknown> = {
      ...this.options.metadata,
    };

    if (this.options.includeRequestDetails) {
      const requestDetails: Record<string, unknown> = {
        method,
        url,
        route,
        params,
      };

      if (
        this.options.includeQueryParams &&
        Object.keys(query || {}).length > 0
      ) {
        requestDetails.query = query;
      }

      if (this.options.includeRequestBody && body) {
        requestDetails.body = body;
      }

      metadata.request = requestDetails;
    }

    // Start profiling
    const profileId = this.logger.startProfile(
      operationName,
      "HTTP Request",
      metadata,
    );
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data: unknown) => {
          // Include response data if requested
          if (this.options.includeResponseDetails) {
            const responseDetails: Record<string, unknown> = {
              statusCode: response.statusCode,
              responseTime: Date.now() - startTime,
            };

            if (this.options.includeResponseBody && data) {
              responseDetails.body = this.sanitizeResponseBody(data);
            }

            // Update profile metadata with response details
            if (profileId !== null) {
              const profile = this.logger.getActiveProfiles().get(profileId);
              if (profile) {
                profile.metadata = {
                  ...profile.metadata,
                  response: responseDetails,
                };
              }
            }
          }

          // Stop profiling and log results
          this.logger.stopProfile(profileId);
        },
        error: (error: Error) => {
          // Include error details in the profile
          if (profileId !== null) {
            const profile = this.logger.getActiveProfiles().get(profileId);
            if (profile) {
              profile.metadata = {
                ...profile.metadata,
                error: {
                  message: error.message,
                  name: error.name,
                  stack: error.stack,
                },
              };
            }
          }

          // Stop profiling with error context
          this.logger.stopProfile(profileId);
        },
      }),
    );
  }

  /**
   * Sanitize response body to avoid circular references and excessive size
   *
   * This method processes the response data to make it suitable for logging:
   * - Handles primitive values directly
   * - Truncates large arrays
   * - Simplifies complex objects
   * - Removes circular references
   *
   * @param data - The response data to sanitize
   * @returns A sanitized version of the response data safe for logging
   * @private
   */
  private sanitizeResponseBody(data: unknown): unknown {
    try {
      // Handle primitive types directly
      if (
        data === null ||
        data === undefined ||
        typeof data === "string" ||
        typeof data === "number" ||
        typeof data === "boolean"
      ) {
        return data;
      }

      // For arrays, sanitize each item
      if (Array.isArray(data)) {
        if (data.length > 10) {
          return [
            ...data.slice(0, 3).map((item) => this.sanitizeResponseBody(item)),
            `... ${data.length - 6} more items ...`,
            ...data.slice(-3).map((item) => this.sanitizeResponseBody(item)),
          ];
        }
        return data.map((item) => this.sanitizeResponseBody(item));
      }

      // For objects, convert to string to avoid circular references
      return JSON.parse(
        JSON.stringify(data, (_key, value: unknown) => {
          // Skip large nested objects/arrays
          if (typeof value === "object" && value !== null) {
            // If object has more than 10 keys, simplify it
            const keys = Object.keys(value);
            if (keys.length > 10) {
              return `[Object with ${keys.length} keys]`;
            }
          }
          return value;
        }),
      );
    } catch (_error) {
      return "[Complex data structure]";
    }
  }
}

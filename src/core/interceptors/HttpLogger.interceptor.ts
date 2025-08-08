import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { IncomingHttpHeaders } from "http";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import {
  isExpressRequest,
  isExpressResponse,
  isFastifyRequest,
  isFastifyResponse,
  RequestType,
  ResponseType,
} from "../../interfaces/Http.interface";
import { HttpLoggerOptions } from "../../interfaces/httpLogger.interface";
import { YuuLogService } from "../../services/YuuLogger.service";

/**
 * Interceptor that logs HTTP requests using structured logs
 *
 * This interceptor provides detailed logs of all HTTP requests,
 * including:
 * - Method and route
 * - Status code
 * - Response time
 * - Correlation ID
 * - Error details
 *
 * @example
 * // Apply to all endpoints in a controller
 * @UseInterceptors(HttpLoggerInterceptor)
 * @Controller('users')
 * export class UsersController {}
 *
 * @example
 * // Apply to a specific endpoint with custom options
 * @UseInterceptors(new HttpLoggerInterceptor({
 *   logRequestHeaders: true,
 *   excludePaths: ['/health']
 * }))
 * @Get()
 * findAll() {}
 *
 * @example
 * // Apply globally in app.module.ts
 * providers: [
 *   {
 *     provide: APP_INTERCEPTOR,
 *     useClass: HttpLoggerInterceptor
 *   }
 * ]
 */
@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  private readonly logger = YuuLogService.getLogger();
  private readonly options: HttpLoggerOptions;

  private readonly DEFAULT_OPTIONS: HttpLoggerOptions = {
    logAllRequests: true,
    logErrors: true,
    logRequestHeaders: false,
    logResponseHeaders: false,
    excludePaths: [],
    enableCorrelationId: true,
    correlationIdHeader: "X-Correlation-ID",
  };

  /**
   * Creates a new instance of the interceptor
   * @param options Configuration options
   */
  constructor(options: HttpLoggerOptions = {}) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Intercepts the HTTP request and logs information about it
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only process HTTP requests
    if (context.getType() !== "http") {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestType>();
    const response = httpContext.getResponse<ResponseType>();

    // Safely extract request information regardless of framework
    const method = request?.method || "UNKNOWN";
    // The URL can be in different properties depending on the framework
    const url = request?.originalUrl || request?.url || "";
    const path = request?.path || (url ? url.split("?")[0] : undefined);
    const params = request?.params !== undefined ? request.params : undefined;
    const query = request?.query !== undefined ? request.query : undefined;
    const body = request?.body;
    const headers = request?.headers || {};
    const ip = this.extractIp(request);
    const userAgent = this.getHeader(headers, "user-agent");

    // If the path is excluded, process without logging
    if (this.isExcludedPath(url)) {
      return next.handle();
    }

    // Generate or retrieve correlation ID
    let correlationId = this.getCorrelationId(request, response);
    if (!correlationId) {
      correlationId = randomUUID();
    }

    // Set correlationId on request and response before any logging
    if (request) {
      request.correlationId = correlationId;
    }
    if (response) {
      response.correlationId = correlationId;
    }

    // Also set in the request context for YuuLogService
    this.logger.setRequestContext({
      correlationId,
    });

    const startTime = Date.now();

    // Build request log object for info logs: always include correlationId as a string
    const requestLog: Record<string, unknown> = {
      method,
      path,
      correlationId: String(correlationId), // Ensure always a string
    };
    if (params !== undefined) requestLog.params = params;
    if (query !== undefined) requestLog.query = query;
    if (ip !== undefined && ip !== "unknown") requestLog.ip = ip;
    if (userAgent !== undefined && userAgent !== "unknown")
      requestLog.userAgent = userAgent;
    if (this.options.logRequestHeaders) requestLog.headers = headers;
    if (body && Object.keys(body as Record<string, unknown>).length > 0)
      requestLog.body = body;

    // Log information about the incoming request
    if (this.options.logAllRequests) {
      this.logger.structuredInfo(`HTTP ${method} ${url}`, "HttpLogger", {
        request: requestLog,
      });
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          if (this.options.logAllRequests) {
            const duration = Date.now() - startTime;
            const statusCode = this.getStatusCode(response);

            // Build response log objects only with defined fields, always include correlationId as a string
            const responseLog: Record<string, unknown> = {
              statusCode,
              duration,
              correlationId: String(correlationId), // Ensure always a string
            };
            if (this.options.logResponseHeaders)
              responseLog.headers = this.getResponseHeaders(response);

            const requestSummary: Record<string, unknown> = {
              method,
              path,
              correlationId: String(correlationId), // Ensure always a string
            };

            // Log 2xx/3xx as info, 4xx as warn, 5xx as error
            if (statusCode >= 400 && statusCode < 500) {
              this.logger.structuredWarn(
                `${method} ${url} ${statusCode}`,
                "HttpLogger",
                {
                  response: responseLog,
                  request: requestSummary,
                  performance: {
                    duration,
                  },
                },
              );
            } else {
              this.logger.structuredInfo(
                `HTTP ${statusCode} ${method} ${url}`,
                "HttpLogger",
                {
                  response: responseLog,
                  request: requestSummary,
                  performance: {
                    duration,
                  },
                },
              );
            }
          }

          return data;
        },
        error: (error: Error) => {
          if (this.options.logErrors) {
            const duration = Date.now() - startTime;
            const statusCode = this.getErrorStatusCode(error);

            // Build error request log object: always include all fields, set to undefined if missing, always include correlationId as a string
            const errorRequestLog: Record<string, unknown> = {
              method,
              path,
              correlationId: String(correlationId), // Ensure always a string
              params: params !== undefined ? params : undefined,
              query: query !== undefined ? query : undefined,
              ip: ip !== undefined && ip !== "unknown" ? ip : undefined,
              userAgent:
                userAgent !== undefined && userAgent !== "unknown"
                  ? userAgent
                  : undefined,
            };
            if (this.options.logRequestHeaders)
              errorRequestLog.headers = headers;

            this.logger.structuredError(
              `HTTP ${statusCode} ${method} ${url}`,
              "HttpLogger",
              {
                message: error.message,
                name: error.name,
                stack: error.stack,
                statusCode,
              },
              {
                response: {
                  statusCode,
                  duration,
                  correlationId: String(correlationId), // Ensure always a string
                },
                request: errorRequestLog,
                performance: {
                  duration,
                },
              },
            );
          }

          // Clear request context when error happens
          this.logger.clearRequestContext();

          throw error; // Re-throw the error to continue the error chain
        },
      }),
    );
  }

  /**
   * Extracts the status code from an error
   * @param error The error object
   * @returns The HTTP status code
   */
  private getErrorStatusCode(error: Error): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    const errorWithStatus = error as { status?: number; statusCode?: number };
    if (typeof errorWithStatus.status === "number") {
      return errorWithStatus.status;
    }

    if (typeof errorWithStatus.statusCode === "number") {
      return errorWithStatus.statusCode;
    }

    return 500;
  }

  /**
   * Extracts the status code from response regardless of framework
   * @param response The response object (Express or Fastify)
   * @returns The HTTP status code
   */
  private getStatusCode(response: ResponseType): number {
    // Handle various response formats
    if (response?.statusCode) {
      return response.statusCode;
    }

    // For Fastify responses
    if (response?.raw?.statusCode) {
      return response.raw.statusCode;
    }

    // For Express responses with getStatus method
    if (response && "getStatus" in response) {
      const responseWithGetStatus = response as { getStatus?: () => number };
      if (typeof responseWithGetStatus.getStatus === "function") {
        return responseWithGetStatus.getStatus();
      }
    }

    // Default status code if none found
    return 200;
  }

  /**
   * Checks if a path is excluded from logs
   */
  private isExcludedPath(path: string): boolean {
    if (!this.options.excludePaths?.length) {
      return false;
    }

    return this.options.excludePaths.some((excludedPath) => {
      if (excludedPath.endsWith("*")) {
        const prefix = excludedPath.slice(0, -1);
        return path.startsWith(prefix);
      }
      return path === excludedPath;
    });
  }

  /**
   * Gets or generates a correlation ID for the request
   */
  private getCorrelationId(
    request: RequestType,
    response: ResponseType,
  ): string {
    if (!this.options.enableCorrelationId) {
      return randomUUID();
    }

    const headerName = this.options.correlationIdHeader || "X-Correlation-ID";

    // Always check headers first for correlation ID
    if (request?.headers) {
      const headerKey = Object.keys(request.headers).find(
        (key) => key.toLowerCase() === headerName.toLowerCase(),
      );
      if (headerKey) {
        let value = request.headers[headerKey];
        if (Array.isArray(value)) {
          value = value.find((v) => !!v);
        }
        if (value && String(value).trim() !== "") {
          const correlationId = String(value);
          request.correlationId = correlationId;
          if (response) response.correlationId = correlationId;
          this.setCorrelationIdHeader(response, headerName, correlationId);
          return correlationId;
        }
      }
    }

    // If the request already has a correlation ID (set elsewhere), use that
    if (request?.correlationId) {
      return request.correlationId;
    }

    // If no correlation ID was found, generate a new one
    const correlationId = randomUUID();
    request.correlationId = correlationId;
    if (response) response.correlationId = correlationId;
    this.setCorrelationIdHeader(response, headerName, correlationId);
    return correlationId;
  }

  /**
   * Sets the correlation ID header in the response, handling different framework types
   */
  private setCorrelationIdHeader(
    response: ResponseType | undefined,
    headerName: string,
    correlationId: string,
  ): void {
    if (!response) return;

    // Try to set using the standard setHeader method
    if (typeof response.setHeader === "function") {
      try {
        response.setHeader(headerName, correlationId);
        return;
      } catch (error) {
        console.debug("Could not set correlation ID header:", error);
      }
    }

    // Handle Express-specific response
    if (isExpressResponse(response)) {
      try {
        response.set?.(headerName, correlationId);
        return;
      } catch (error) {
        console.debug(
          "Could not set correlation ID header on Express response:",
          error,
        );
      }
    }

    // Handle Fastify-specific response
    if (isFastifyResponse(response)) {
      try {
        response.header?.(headerName, correlationId);
        return;
      } catch (error) {
        console.debug(
          "Could not set correlation ID header on Fastify response:",
          error,
        );
      }
    }
  }

  /**
   * Extracts the client IP from the request, compatible with Express and Fastify
   */
  private extractIp(request: RequestType): string {
    if (!request) return "unknown";

    // Direct IP property
    if (request.ip) return request.ip;

    // For Express
    const forwardedFor = this.getHeader(request.headers, "x-forwarded-for");
    if (forwardedFor) {
      return (
        Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : String(forwardedFor).split(",")[0]
      ).trim();
    }

    // Express-specific socket remote address
    if (isExpressRequest(request) && request.socket?.remoteAddress) {
      return request.socket.remoteAddress;
    }

    // Fastify-specific request handling
    if (isFastifyRequest(request)) {
      if (request.raw?.socket?.remoteAddress) {
        return request.raw.socket.remoteAddress;
      }
      // Additional Fastify-specific IP detection
      if (request.id) {
        // For Fastify 3.x+ with socket info in request.raw
        const fastifyRequest = request as {
          socket?: { remoteAddress?: string };
        };
        if (fastifyRequest.socket?.remoteAddress) {
          return fastifyRequest.socket.remoteAddress;
        }
      }
    }

    // For any other framework with raw socket access
    if (request.raw?.socket?.remoteAddress) {
      return request.raw.socket.remoteAddress;
    }

    // For any other framework
    return "unknown";
  }

  /**
   * Gets a header value, regardless of whether it's in lowercase or uppercase
   */
  private getHeader(
    headers: IncomingHttpHeaders | undefined,
    name: string,
  ): string | string[] | number | undefined {
    // Check if headers is undefined or null
    if (!headers) {
      return undefined;
    }

    name = name.toLowerCase();
    // First try direct access with lowercase name
    if (headers[name] !== undefined) {
      return headers[name];
    }

    // Then try to find a case-insensitive match
    const matchingKey = Object.keys(headers).find(
      (k) => k.toLowerCase() === name,
    );
    return matchingKey ? headers[matchingKey] : undefined;
  }

  /**
   * Gets the response headers, compatible with Express and Fastify
   */
  private getResponseHeaders(
    response: ResponseType,
  ): Record<string, string | string[] | undefined> {
    if (!response) {
      return {};
    }

    // Express-style getHeaders method
    if (typeof response.getHeaders === "function") {
      try {
        const headers = response.getHeaders();
        // Convert the headers to the expected type
        const convertedHeaders: Record<string, string | string[] | undefined> =
          {};
        Object.keys(headers).forEach((key) => {
          const value = headers[key];
          if (typeof value === "number") {
            convertedHeaders[key] = String(value);
          } else {
            convertedHeaders[key] = value;
          }
        });
        return convertedHeaders;
      } catch (error) {
        console.debug("Error getting headers from Express response:", error);
      }
    }

    // Fastify raw headers
    if (
      response.raw?.getHeaders &&
      typeof response.raw.getHeaders === "function"
    ) {
      try {
        const rawHeaders = response.raw.getHeaders();
        const convertedHeaders: Record<string, string | string[] | undefined> =
          {};
        Object.keys(rawHeaders).forEach((key) => {
          const value = rawHeaders[key];
          if (typeof value === "number") {
            convertedHeaders[key] = String(value);
          } else {
            convertedHeaders[key] = value;
          }
        });
        return convertedHeaders;
      } catch (error) {
        console.debug(
          "Error getting headers from Fastify raw response:",
          error,
        );
      }
    }

    // Fastify-specific headers map
    if (isFastifyResponse(response)) {
      const fastifyResponse = response as {
        getHeaders?: () => Record<
          string,
          string | string[] | number | undefined
        >;
      };
      if (typeof fastifyResponse.getHeaders === "function") {
        try {
          const headers = fastifyResponse.getHeaders();
          const convertedHeaders: Record<
            string,
            string | string[] | undefined
          > = {};
          Object.keys(headers).forEach((key) => {
            const value = headers[key];
            if (typeof value === "number") {
              convertedHeaders[key] = String(value);
            } else {
              convertedHeaders[key] = value;
            }
          });
          return convertedHeaders;
        } catch (error) {
          console.debug("Error getting headers from Fastify response:", error);
        }
      }
    }

    return {};
  }
}

import { ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";
import { CallHandler } from "@nestjs/common";
import { Observable, of, throwError } from "rxjs";
import { HttpLoggerInterceptor } from "../../src/core/interceptors/HttpLogger.interceptor";
import { YuuLogService } from "../../src/services/YuuLogger.service";

// Mock YuuLogService
jest.mock("../../src/services/YuuLogger.service", () => {
  const mockLogger = {
    structuredInfo: jest.fn(),
    structuredWarn: jest.fn(),
    structuredError: jest.fn(),
    setRequestContext: jest.fn(),
    clearRequestContext: jest.fn(),
  };

  return {
    YuuLogService: {
      getLogger: jest.fn(() => mockLogger),
    },
  };
});

describe("HttpLoggerInterceptor", () => {
  let interceptor: HttpLoggerInterceptor;

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let mockLogger: any;
  let mockCallHandler: CallHandler;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    // Reset all mocks between tests
    jest.clearAllMocks();

    // Setup mock logger
    mockLogger = YuuLogService.getLogger();

    // Create the interceptor with default options
    interceptor = new HttpLoggerInterceptor();

    // Setup mock call handler
    mockCallHandler = {
      handle: jest.fn(() => of({ result: "success" })),
    } as unknown as CallHandler;

    // Setup mock execution context
    mockExecutionContext = {
      getType: jest.fn(() => "http"),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => mockRequest),
        getResponse: jest.fn(() => mockResponse),
      })),
    } as unknown as ExecutionContext;
  });

  // Common mock request and response objects
  const mockRequest = {
    method: "GET",
    originalUrl: "/test",
    path: "/test",
    params: { id: "123" },
    query: { filter: "active" },
    body: { data: "test" },
    headers: { "user-agent": "jest-test", "x-forwarded-for": "127.0.0.1" },
    __framework: "express",
  };

  const mockResponse = {
    statusCode: 200,
    getHeaders: jest.fn(() => ({ "content-type": "application/json" })),
    setHeader: jest.fn(),
    __framework: "express",
  };

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("should log request and response for successful requests", (done) => {
    // Execute the interceptor
    const result$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    // Assert the result
    result$.subscribe({
      next: (data) => {
        // Check that data passes through
        expect(data).toEqual({ result: "success" });

        // Verify logging happened
        expect(mockLogger.structuredInfo).toHaveBeenCalledTimes(2);

        // First call should log the request
        expect(mockLogger.structuredInfo.mock.calls[0][0]).toContain(
          "HTTP GET /test",
        );

        // Second call should log the response
        expect(mockLogger.structuredInfo.mock.calls[1][0]).toContain(
          "HTTP 200 GET /test",
        );

        // Check that correlation ID was set
        expect(mockLogger.setRequestContext).toHaveBeenCalled();
        const requestContext = mockLogger.setRequestContext.mock.calls[0][0];
        expect(requestContext).toHaveProperty("correlationId");

        done();
      },
      error: (error) => done(error),
    });
  });

  it("should log errors when they occur", (done) => {
    // Setup call handler to throw an error
    const errorCallHandler = {
      handle: jest.fn(() =>
        throwError(
          () => new HttpException("Test error", HttpStatus.BAD_REQUEST),
        ),
      ),
    } as unknown as CallHandler;

    // Execute the interceptor
    const result$ = interceptor.intercept(
      mockExecutionContext,
      errorCallHandler,
    );

    // Assert the result
    result$.subscribe({
      next: () => done(new Error("Should not be called")),
      error: (error) => {
        // Verify error is passed through
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toBe("Test error");
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);

        // Verify error was logged
        expect(mockLogger.structuredError).toHaveBeenCalledTimes(1);
        expect(mockLogger.structuredError.mock.calls[0][0]).toContain(
          "HTTP 400 GET /test",
        );

        // Check that context was cleared
        expect(mockLogger.clearRequestContext).toHaveBeenCalled();

        done();
      },
    });
  });

  it("should not log requests to excluded paths", (done) => {
    // Create interceptor with excluded paths
    const interceptorWithExclusions = new HttpLoggerInterceptor({
      excludePaths: ["/test", "/health*"],
    });

    // Execute the interceptor
    const result$ = interceptorWithExclusions.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    // Assert the result
    result$.subscribe({
      next: () => {
        // Verify no logging happened
        expect(mockLogger.structuredInfo).not.toHaveBeenCalled();
        done();
      },
      error: (error) => done(error),
    });
  });

  it("should handle and use existing correlation IDs", (done) => {
    // Setup request with existing correlation ID
    const requestWithCorrelationId = {
      ...mockRequest,
      headers: {
        ...mockRequest.headers,
        "x-correlation-id": "existing-correlation-id",
        "X-Correlation-ID": "existing-correlation-id", // Añade ambas variantes para máxima compatibilidad
      },
    };

    // Create a context with the correlation ID in headers
    const contextWithCorrelationId = {
      getType: jest.fn(() => "http"),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => requestWithCorrelationId),
        getResponse: jest.fn(() => mockResponse),
      })),
    } as unknown as ExecutionContext;

    // Execute the interceptor
    const result$ = interceptor.intercept(
      contextWithCorrelationId,
      mockCallHandler,
    );

    // Assert the result
    result$.subscribe({
      next: () => {
        // Verify correlation ID was used
        expect(mockLogger.setRequestContext).toHaveBeenCalledWith({
          correlationId: "existing-correlation-id",
        });

        // Verify response was logged with the correlation ID
        expect(
          mockLogger.structuredInfo.mock.calls[1][2].response.correlationId,
        ).toBe("existing-correlation-id");

        done();
      },
      error: (error) => done(error),
    });
  });

  it("should log 4xx responses as warnings", (done) => {
    // Create a response with a 4xx status code
    const warningResponse = {
      ...mockResponse,
      statusCode: 404,
    };

    const contextWithWarning = {
      ...mockExecutionContext,
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => mockRequest),
        getResponse: jest.fn(() => warningResponse),
      })),
    } as unknown as ExecutionContext;

    // Execute the interceptor
    const result$ = interceptor.intercept(contextWithWarning, mockCallHandler);

    // Assert the result
    result$.subscribe({
      next: () => {
        // Verify warning was logged
        expect(mockLogger.structuredWarn).toHaveBeenCalledTimes(1);
        expect(mockLogger.structuredWarn.mock.calls[0][0]).toContain(
          "GET /test 404",
        );

        done();
      },
      error: (error) => done(error),
    });
  });

  it("should log request and response headers when options are set", (done) => {
    // Create interceptor with header logging enabled
    const interceptorWithHeaderLogging = new HttpLoggerInterceptor({
      logRequestHeaders: true,
      logResponseHeaders: true,
    });

    // Execute the interceptor
    const result$ = interceptorWithHeaderLogging.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    // Assert the result
    result$.subscribe({
      next: () => {
        // Verify request headers were logged
        expect(
          mockLogger.structuredInfo.mock.calls[0][2].request.headers,
        ).toBeDefined();

        // Verify response headers were logged
        expect(
          mockLogger.structuredInfo.mock.calls[1][2].response.headers,
        ).toBeDefined();

        done();
      },
      error: (error) => done(error),
    });
  });

  it("should not process non-http requests", (done) => {
    // Create a non-HTTP context
    const nonHttpContext = {
      ...mockExecutionContext,
      getType: jest.fn(() => "rpc"), // Some other type
    } as unknown as ExecutionContext;

    // Execute the interceptor
    const result$ = interceptor.intercept(nonHttpContext, mockCallHandler);

    // Assert the result
    result$.subscribe({
      next: () => {
        // Verify no logging happened
        expect(mockLogger.structuredInfo).not.toHaveBeenCalled();
        expect(mockLogger.setRequestContext).not.toHaveBeenCalled();

        done();
      },
      error: (error) => done(error),
    });
  });

  it("should handle a Fastify request correctly", (done) => {
    // Create a Fastify-style request and response
    const fastifyRequest = {
      method: "POST",
      url: "/fastify-test",
      params: { id: "456" },
      query: { sort: "desc" },
      body: { data: "fastify" },
      headers: { "user-agent": "fastify-test" },
      raw: { socket: { remoteAddress: "192.168.1.1" } },
      __framework: "fastify",
      id: "req-1",
      server: {},
    };

    const fastifyResponse = {
      statusCode: 201,
      raw: {
        statusCode: 201,
        getHeaders: jest.fn(() => ({ "content-type": "application/json" })),
      },
      header: jest.fn(),
      sent: false,
      server: {},
      __framework: "fastify",
    };

    const fastifyContext = {
      ...mockExecutionContext,
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => fastifyRequest),
        getResponse: jest.fn(() => fastifyResponse),
      })),
    } as unknown as ExecutionContext;

    // Execute the interceptor
    const result$ = interceptor.intercept(fastifyContext, mockCallHandler);

    // Assert the result
    result$.subscribe({
      next: () => {
        // Verify logging happened
        expect(mockLogger.structuredInfo).toHaveBeenCalledTimes(2);

        // Check that the correct framework was detected
        expect(mockLogger.structuredInfo.mock.calls[0][2].request.method).toBe(
          "POST",
        );

        done();
      },
      error: (error) => done(error),
    });
  });
});

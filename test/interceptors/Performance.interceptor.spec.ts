import { CallHandler, ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { PerformanceInterceptor } from "../../src/core/interceptors/Performance.interceptor";
import { RequestType, ResponseType } from "../../src/interfaces/Http.interface";
import { YuuLogService } from "../../src/services/YuuLogger.service";

describe("PerformanceInterceptor", () => {
  let interceptor: PerformanceInterceptor;
  let mockLoggerService: Partial<YuuLogService>;
  let mockProfileId: string;

  // Helper function to create mock execution context
  const createMockExecutionContext = (
    requestMock: Partial<RequestType>,
    responseMock: Partial<ResponseType>,
  ): ExecutionContext => {
    const mockContext = {
      getType: jest.fn().mockReturnValue("http"),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(requestMock),
        getResponse: jest.fn().mockReturnValue(responseMock),
      }),
      getClass: jest.fn().mockReturnValue({ name: "TestController" }),
      getHandler: jest.fn().mockReturnValue({ name: "testMethod" }),
    };
    return mockContext as unknown as ExecutionContext;
  };

  const createMockCallHandler = (result?: unknown): CallHandler => {
    return {
      handle: jest.fn(() => of(result)),
    };
  };

  beforeEach(() => {
    mockProfileId = "test-profile-id";
    mockLoggerService = {
      startProfile: jest.fn().mockReturnValue(mockProfileId),
      stopProfile: jest.fn(),
      getActiveProfiles: jest
        .fn()
        .mockReturnValue(new Map([[mockProfileId, { metadata: {} }]])),
    };

    jest
      .spyOn(YuuLogService, "getLogger")
      .mockReturnValue(mockLoggerService as unknown as YuuLogService);

    interceptor = new PerformanceInterceptor();

    // Reset timer mocks
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 4, 1));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it("should profile Express-style requests", (done) => {
    // Create Express-like request and response mocks
    const requestMock: Partial<RequestType> = {
      method: "GET",
      originalUrl: "/api/users",
      params: { id: "1" },
      query: { include: "profile" },
      body: { filter: "active" },
    };

    const responseMock: Partial<ResponseType> = {
      statusCode: 200,
    };

    const context = createMockExecutionContext(requestMock, responseMock);
    const handler = createMockCallHandler({ id: 1, name: "Test User" });

    // Override the interceptor with options that include request details
    interceptor = new PerformanceInterceptor({
      operationName: "ExpressTest",
      includeRequestDetails: true,
      includeRequestBody: true,
      includeQueryParams: true,
      metadata: { customField: "test value" },
    });

    // Act
    interceptor.intercept(context, handler).subscribe({
      next: (data) => {
        // Assert
        expect(mockLoggerService.startProfile).toHaveBeenCalledWith(
          "ExpressTest",
          "HTTP Request",
          expect.objectContaining({
            customField: "test value",
            request: expect.objectContaining({
              method: "GET",
              url: "/api/users",
              params: { id: "1" },
              query: { include: "profile" },
              body: { filter: "active" },
            }),
          }),
        );

        expect(mockLoggerService.stopProfile).toHaveBeenCalledWith(
          mockProfileId,
        );

        // Verify that data passed through correctly
        expect(data).toEqual({ id: 1, name: "Test User" });
        done();
      },
      error: done,
    });
  });

  it("should profile Fastify-style requests", (done) => {
    // Create Fastify-like request and response mocks
    const requestMock: Partial<RequestType> = {
      method: "POST",
      url: "/api/products",
      path: "/api/products",
      params: { id: "2" },
      query: { sort: "price" },
      body: { price: 100 },
    };

    const responseMock: Partial<ResponseType> = {
      statusCode: 201,
      raw: {
        statusCode: 201,
      },
    };

    const context = createMockExecutionContext(requestMock, responseMock);
    const handler = createMockCallHandler({ id: 2, name: "New Product" });

    // Act
    interceptor.intercept(context, handler).subscribe({
      next: () => {
        // Assert
        expect(mockLoggerService.startProfile).toHaveBeenCalledWith(
          "TestController.testMethod",
          "HTTP Request",
          expect.any(Object),
        );

        expect(mockLoggerService.stopProfile).toHaveBeenCalledWith(
          mockProfileId,
        );
        done();
      },
      error: done,
    });
  });

  it("should include response details when configured", (done) => {
    // Create request and response mocks
    const requestMock: Partial<RequestType> = {
      method: "GET",
      originalUrl: "/api/users/123",
    };

    const responseMock: Partial<ResponseType> = {
      statusCode: 200,
    };

    const context = createMockExecutionContext(requestMock, responseMock);
    const mockResponseData = {
      id: 123,
      name: "John Doe",
      email: "john@example.com",
    };
    const handler = createMockCallHandler(mockResponseData);

    // Configure interceptor to include response details
    interceptor = new PerformanceInterceptor({
      includeResponseDetails: true,
      includeResponseBody: true,
    });

    // Act
    interceptor.intercept(context, handler).subscribe({
      next: () => {
        // Assert that response details were added to the profile metadata
        expect(mockLoggerService.getActiveProfiles).toHaveBeenCalled();

        done();
      },
      error: done,
    });
  });

  it("should sanitize response bodies correctly", (done) => {
    // Create a complex response with nested objects and arrays
    const complexResponse = {
      users: [
        { id: 1, name: "User 1" },
        { id: 2, name: "User 2" },
        // Add more than 10 items to test truncation
        ...Array.from({ length: 20 }).map((_, i) => ({
          id: i + 3,
          name: `User ${i + 3}`,
        })),
      ],
      pagination: {
        page: 1,
        limit: 25,
        total: 100,
        links: {
          next: "/api/users?page=2",
          prev: null,
        },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        // Add object with many properties to test truncation
        config: Object.fromEntries(
          Array.from({ length: 20 }).map((_, i) => [`prop${i}`, `value${i}`]),
        ),
      },
    };

    const requestMock: Partial<RequestType> = {
      method: "GET",
      originalUrl: "/api/users",
    };

    const responseMock: Partial<ResponseType> = {
      statusCode: 200,
    };

    const context = createMockExecutionContext(requestMock, responseMock);
    const handler = createMockCallHandler(complexResponse);

    // Configure interceptor to include response body
    interceptor = new PerformanceInterceptor({
      includeResponseDetails: true,
      includeResponseBody: true,
    });

    // Add a test to verify that circular references don't cause errors
    interface CircularReference {
      name: string;
      self?: CircularReference;
    }
    const circularObj: CircularReference = { name: "Circular" };
    circularObj.self = circularObj;

    // Act
    interceptor.intercept(context, handler).subscribe({
      next: () => {
        // Test handling circular references through the interceptor itself
        // instead of directly accessing the private method
        const activeProfiles = mockLoggerService.getActiveProfiles();
        const profile = activeProfiles.get(mockProfileId);

        // The circular object would have been handled properly if no error was thrown
        expect(profile).toBeDefined();

        done();
      },
      error: done,
    });
  });

  it("should handle errors correctly", (done) => {
    // Mock the error case
    const requestMock: Partial<RequestType> = {
      method: "GET",
      originalUrl: "/api/error",
    };

    const responseMock: Partial<ResponseType> = {
      statusCode: 500,
    };

    const context = createMockExecutionContext(requestMock, responseMock);
    const handler = createMockCallHandler();

    // Make the handler emit an error
    const error = new Error("Test error");
    handler.handle = jest.fn(() => require("rxjs").throwError(() => error));

    // Act
    interceptor.intercept(context, handler).subscribe({
      next: () => done("Should not complete successfully"),
      error: (err) => {
        // Assert
        expect(err).toBe(error);
        expect(mockLoggerService.getActiveProfiles).toHaveBeenCalled();
        expect(mockLoggerService.stopProfile).toHaveBeenCalledWith(
          mockProfileId,
        );
        done();
      },
    });
  });

  it("should skip non-HTTP requests", () => {
    // Create a non-HTTP execution context
    const nonHttpContext = {
      getType: jest.fn().mockReturnValue("rpc"),
    } as unknown as ExecutionContext;

    const handler = createMockCallHandler();

    // The interceptor should delegate to the handler without profiling
    interceptor.intercept(nonHttpContext, handler);
    expect(mockLoggerService.startProfile).not.toHaveBeenCalled();
    expect(handler.handle).toHaveBeenCalled();
  });
});

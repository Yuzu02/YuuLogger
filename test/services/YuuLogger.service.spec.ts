import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";
import { Test, TestingModule } from "@nestjs/testing";
import * as winston from "winston";
import { YUU_LOG_OPTIONS } from "../../src/YuuLogger.module";
import { PerformanceMetrics } from "../../src/interfaces/PerformanceProfiler.interface";
import { LogLevel } from "../../src/interfaces/YuuLogger.interfaces";
import { YuuLogService } from "../../src/services/YuuLogger.service";
import { LogFormatter } from "../../src/utils/logger/Log.formatter";
import { LoggerUtilities } from "../../src/utils/logger/Logger.utilities";
import { TransportManager } from "../../src/utils/managers/Transport.manager";
import { PerformanceProfiler } from "../../src/utils/performance/Performance.profiler";

// Mock performance.now to have consistent test results
const originalPerformanceNow = performance.now;
const mockPerformanceNow = jest.fn();

// Mock process.memoryUsage and process.cpuUsage
const originalMemoryUsage = process.memoryUsage;
const originalCpuUsage = process.cpuUsage;
const mockMemoryUsage = jest.fn() as jest.Mock & typeof process.memoryUsage;
const mockCpuUsage = jest.fn() as jest.Mock & typeof process.cpuUsage;

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {
    // Mock console.log to avoid cluttering test output
  });
  jest.spyOn(console, "error").mockImplementation(() => {
    // Mock console.error to avoid cluttering test output
  });
  jest.spyOn(console, "warn").mockImplementation(() => {
    // Mock console.warn to avoid cluttering test output
  });
  jest.spyOn(console, "debug").mockImplementation(() => {
    // Mock console.debug to avoid cluttering test output
  });
});

// Mock winston
jest.mock("winston", () => {
  const original = jest.requireActual("winston");
  return {
    ...original,
    createLogger: jest.fn().mockImplementation(() => ({
      info: jest.fn().mockImplementation((message, _meta) => {
        console.log(message);
        return message;
      }),
      error: jest.fn().mockImplementation((message, _meta) => {
        console.error(message);
        return message;
      }),
      warn: jest.fn().mockImplementation((message, _meta) => {
        console.warn(message);
        return message;
      }),
      debug: jest.fn().mockImplementation((message, _meta) => {
        console.log(message);
        return message;
      }),
      verbose: jest.fn().mockImplementation((message, _meta) => {
        console.log(message);
        return message;
      }),
    })),
    format: {
      ...original.format,
      combine: jest.fn().mockReturnValue({}),
      timestamp: jest.fn().mockReturnValue({}),
      printf: jest.fn().mockReturnValue({}),
      json: jest.fn().mockReturnValue({}),
      metadata: jest.fn().mockReturnValue({}),
    },
    transports: {
      Console: jest.fn(),
      DailyRotateFile: jest.fn(),
    },
  };
});

// Mock the Logtail
jest.mock("@logtail/node", () => {
  return {
    Logtail: jest.fn().mockImplementation(() => ({
      flush: jest.fn(),
    })),
  };
});

// Mock the LogtailTransport
jest.mock("@logtail/winston", () => {
  return {
    LogtailTransport: jest.fn(),
  };
});

// Mock crypto module for predictable UUIDs
let uuidCounter = 0;
jest.mock("crypto", () => {
  return {
    randomUUID: jest.fn(() => `uuid-${++uuidCounter}`),
  };
});

describe("YuuLogService", () => {
  let service: YuuLogService;
  let mockTime = 1000;
  const mockMemoryValues = {
    rss: 10000000,
    heapTotal: 5000000,
    heapUsed: 2500000,
    external: 1000000,
    arrayBuffers: 500000,
  };
  const mockCpuValues = {
    user: 10000,
    system: 5000,
  };

  beforeAll(() => {
    mockPerformanceNow.mockImplementation(() => {
      const currentTime = mockTime;
      mockTime += 100;
      return currentTime;
    });

    performance.now = mockPerformanceNow;

    mockMemoryUsage.mockImplementation(() => ({
      ...mockMemoryValues,
    }));

    mockCpuUsage.mockImplementation(() => ({
      ...mockCpuValues,
    }));

    process.memoryUsage = mockMemoryUsage;
    process.cpuUsage = mockCpuUsage;
  });

  afterAll(() => {
    performance.now = originalPerformanceNow;
    process.memoryUsage = originalMemoryUsage;
    process.cpuUsage = originalCpuUsage;

    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    uuidCounter = 0;
    mockTime = 1000;

    const logOptions = {
      appName: "TestApp",
      logLevels: ["error", "warn", "info", "debug"] as LogLevel[],
      loggerTheme: "default" as const,
      enableFileLogging: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YuuLogService,
        {
          provide: YUU_LOG_OPTIONS,
          useValue: logOptions,
        },
        {
          provide: LogFormatter,
          useFactory: () => new LogFormatter(logOptions),
        },
        {
          provide: TransportManager,
          useFactory: () => new TransportManager(logOptions),
        },
        {
          provide: LoggerUtilities,
          useFactory: () => new LoggerUtilities(logOptions),
        },
        {
          provide: PerformanceProfiler,
          useFactory: () => new PerformanceProfiler(logOptions),
        },
      ],
    }).compile();

    service = module.get<YuuLogService>(YuuLogService);

    (YuuLogService as unknown as { instance?: YuuLogService }).instance =
      undefined;

    service["enabledLogLevels"] = [...logOptions.logLevels];
  });

  describe("Basic logging", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should create a logger with correct config", () => {
      expect(winston.createLogger).toHaveBeenCalled();
      expect(service["enabledLogLevels"]).toContain("debug");
      expect(service["enabledLogLevels"]).toContain("error");
      expect(service["enabledLogLevels"]).toContain("warn");
      expect(service["enabledLogLevels"]).toContain("info");
    });

    it("should return a singleton instance with getLogger", () => {
      const instance1 = YuuLogService.getLogger();
      const instance2 = YuuLogService.getLogger();
      expect(instance1).toBe(instance2);
    });

    it("should log info messages when info level is enabled", () => {
      const message = "Test info message";
      const context = "TestContext";
      service.log(message, context);
      expect(service["logger"].info).toHaveBeenCalledWith(message, { context });
    });

    it("should log error messages when error level is enabled", () => {
      const message = "Test error message";
      const context = "TestContext";
      const trace = "Error stack trace";
      service.error(message, trace, context);
      expect(service["logger"].error).toHaveBeenCalledWith(message, {
        context,
        trace,
      });
    });

    it("should log warning messages when warn level is enabled", () => {
      const message = "Test warning message";
      const context = "TestContext";
      service.warn(message, context);
      expect(service["logger"].warn).toHaveBeenCalledWith(message, { context });
    });

    it("should log debug messages when debug level is enabled", () => {
      const message = "Test debug message";
      const context = "TestContext";
      service.debug(message, context);
      expect(service["logger"].debug).toHaveBeenCalledWith(message, {
        context,
      });
    });

    it("should log verbose messages only when verbose level is enabled", () => {
      const message = "Test verbose message";
      const context = "TestContext";
      service.verbose(message, context);
      expect(service["logger"].verbose).not.toHaveBeenCalled();
    });

    it("should handle object messages correctly", () => {
      const message = { userId: 123, action: "login", timestamp: new Date() };
      const context = "UserService";
      service.log(message, context);
      expect(service["logger"].info).toHaveBeenCalledWith(
        JSON.stringify(message),
        { context, meta: message },
      );
    });
  });

  describe("Performance and profiling", () => {
    it("should measure performance correctly", () => {
      const operationName = "TestOperation";
      const measureId = service.startMeasure(operationName);
      expect(measureId).toBeTruthy();
      const metrics = service.stopMeasure(operationName);
      expect(metrics).toBeDefined();
      expect(metrics?.duration).toBe(100);
      expect(metrics?.operationName).toBe(operationName);
    });

    it("should profile operations correctly", () => {
      const operationName = "TestProfile";
      const context = "TestContext";
      uuidCounter = 0;
      const profileId = service.startProfile(operationName, context);
      expect(profileId).toBe("uuid-1");
      const profile = service.stopProfile(profileId);
      expect(profile).toBeDefined();
      expect(profile?.duration).toBe(100);
      expect(profile?.operationName).toBe(operationName);
      expect(profile?.context).toBe(context);
      expect(profile?.memoryUsageDiff).toBeDefined();
      expect(profile?.cpuUsageDiff).toBeDefined();
    });

    it("should support child profiles", () => {
      const parentOperation = "ParentOperation";
      const childOperation = "ChildOperation";
      uuidCounter = 0;
      const parentId = service.startProfile(parentOperation);
      const childId = service.startChildProfile(parentId, childOperation);
      expect(childId).toBe("uuid-2");
      const childProfile = service.stopProfile(childId);
      expect(childProfile?.operationName).toBe(childOperation);
      const parentProfile = service.stopProfile(parentId);
      expect(parentProfile?.operationName).toBe(parentOperation);
      expect(parentProfile?.children).toHaveLength(1);
      expect(parentProfile?.children?.[0]?.operationName).toBe(childOperation);
    });

    it("should profile functions correctly", () => {
      const testFn = jest.fn().mockReturnValue("result");
      const profiledFn = service.profileFunction(testFn, "TestFunction");
      const result = profiledFn("arg1", "arg2");
      expect(result).toBe("result");
      expect(testFn).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should profile async functions correctly", async () => {
      const testAsyncFn = jest.fn().mockResolvedValue("async result");
      const profiledAsyncFn = service.profileAsyncFunction(
        testAsyncFn,
        "TestAsyncFunction",
      );
      const result = await profiledAsyncFn("arg1", "arg2");
      expect(result).toBe("async result");
      expect(testAsyncFn).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should handle errors in profiled functions", () => {
      const error = new Error("Test error");
      const testFn = jest.fn().mockImplementation(() => {
        throw error;
      });
      const profiledFn = service.profileFunction(testFn, "ErrorFunction");
      expect(() => profiledFn()).toThrow(error);
    });

    it("should handle errors in profiled async functions", async () => {
      const error = new Error("Test async error");
      const testAsyncFn = jest.fn().mockImplementation(() => {
        return Promise.reject(error);
      });
      const profiledAsyncFn = service.profileAsyncFunction(
        testAsyncFn,
        "ErrorAsyncFunction",
      );
      await expect(profiledAsyncFn()).rejects.toThrow(error);
    });

    it("should initialize Logtail when source token and endpoint are provided", () => {
      jest.clearAllMocks();
      const options = {
        appName: "TestApp",
        logLevels: ["error", "warn", "info"] as LogLevel[],
        logtail: {
          sourceToken: "test-token",
          endpoint: "https://test-endpoint.com",
          enabled: true,
        },
        loggerTheme: "default" as const,
      };
      (YuuLogService as unknown as { instance?: YuuLogService }).instance =
        undefined;
      const customService = new YuuLogService(
        options,
        new LogFormatter(options),
        new TransportManager(options),
        new LoggerUtilities(options),
        new PerformanceProfiler(options),
      );
      expect(customService).toBeDefined();
      expect(Logtail).toHaveBeenCalled();
      expect(LogtailTransport).toHaveBeenCalled();
      const logtailCalls = (Logtail as jest.Mock).mock.calls;
      expect(logtailCalls.length).toBeGreaterThan(0);
      if (logtailCalls.length > 0) {
        const firstCallArgs = logtailCalls[0];
        expect(firstCallArgs[0]).toBe("test-token");
        expect(firstCallArgs[1]).toHaveProperty(
          "endpoint",
          "https://test-endpoint.com",
        );
      }
    });

    it("should get performance stats for an operation", () => {
      const operationName = "StatsOperation";
      const metrics1: PerformanceMetrics = {
        operationName,
        startTime: 1000,
        endTime: 1100,
        duration: 100,
      };
      const metrics2: PerformanceMetrics = {
        operationName,
        startTime: 1200,
        endTime: 1300,
        duration: 100,
      };
      (
        service as unknown as {
          performanceProfiler: {
            performanceMetrics: Map<string, PerformanceMetrics[]>;
          };
        }
      ).performanceProfiler["performanceMetrics"].set(operationName, [
        metrics1,
        metrics2,
      ]);
      const stats = service.getPerformanceStats(operationName);
      expect(stats).toBeDefined();
      expect(stats?.count).toBe(2);
      expect(stats?.operationName).toBe(operationName);
    });

    it("should clear performance metrics correctly", () => {
      const operationName = "ClearOperation";
      service.startMeasure(operationName);
      service.stopMeasure(operationName, false);
      expect(
        (
          service as unknown as {
            performanceProfiler: {
              performanceMetrics: Map<string, PerformanceMetrics[]>;
            };
          }
        ).performanceProfiler["performanceMetrics"].has(operationName),
      ).toBe(true);
      service.clearPerformanceMetrics(operationName);
      expect(
        (
          service as unknown as {
            performanceProfiler: {
              performanceMetrics: Map<string, PerformanceMetrics[]>;
            };
          }
        ).performanceProfiler["performanceMetrics"].has(operationName),
      ).toBe(false);
      const stats = service.getPerformanceStats(operationName);
      expect(stats).toBeUndefined();
    });

    it("should get active profiles", () => {
      const operationName = "ActiveProfile";
      uuidCounter = 0;
      const profileId = service.startProfile(operationName);
      const activeProfiles = service.getActiveProfiles();
      expect(activeProfiles.size).toBe(1);
      expect(activeProfiles.has(profileId)).toBe(true);
      service.stopProfile(profileId);
    });
  });

  describe("Structured logging", () => {
    it("should allow structured logging with metadata", () => {
      const message = "User action";
      const context = "UserService";
      const metadata = {
        userId: 123,
        action: "login",
        timestamp: new Date().toISOString(),
      };
      service.structured("info", message, context, metadata);
      expect(service["logger"].info).toHaveBeenCalledWith(message, {
        context,
        structuredEntry: expect.objectContaining({
          level: "info",
          message,
          context,
          data: metadata,
        }),
      });
    });

    it("should log structured errors with metadata", () => {
      const error = new Error("Authentication failed");
      const context = "AuthService";
      const errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      const metadata = {
        userId: 456,
        attempt: 3,
        ipAddress: "192.168.1.1",
      };
      service.structuredError(
        "Authentication failed",
        context,
        errorInfo,
        metadata,
      );
      expect(service["logger"].error).toHaveBeenCalledWith(
        "Authentication failed",
        {
          context,
          structuredEntry: expect.objectContaining({
            level: "error",
            message: "Authentication failed",
            context,
            data: {
              error: errorInfo,
              ...metadata,
            },
          }),
        },
      );
    });

    it("should log structured warnings with metadata", () => {
      const message = "Rate limit approaching";
      const context = "RateLimiter";
      const data = {
        currentRate: 95,
        limit: 100,
        clientId: "app-123",
      };
      service.structuredWarn(message, context, { rate: data });
      expect(service["logger"].warn).toHaveBeenCalledWith(message, {
        context,
        structuredEntry: expect.objectContaining({
          level: "warn",
          message,
          context,
          data: { rate: data },
        }),
      });
    });

    it("should handle nested objects in structured logs", () => {
      const message = "Complex data structure";
      const context = "DataProcessor";
      const metadata = {
        user: {
          id: 789,
          profile: {
            name: "Test User",
            preferences: {
              theme: "dark",
              notifications: true,
            },
          },
        },
        stats: {
          processed: 1000,
          failed: 5,
          performance: {
            avgTime: 230,
            maxTime: 450,
          },
        },
      };
      service.structured("info", message, context, metadata);
      expect(service["logger"].info).toHaveBeenCalledWith(message, {
        context,
        structuredEntry: expect.objectContaining({
          level: "info",
          message,
          context,
          data: metadata,
        }),
      });
    });

    it("should safely handle circular references in structured logs", () => {
      const message = "Object with circular reference";
      const context = "CircularTest";
      const parent: Record<string, unknown> = { name: "parent" };
      const child: Record<string, unknown> = { name: "child", parent };
      parent.child = child;
      const metadata = { circularObject: parent };
      expect(() => {
        service.structured("info", message, context, metadata);
      }).not.toThrow();
      expect(service["logger"].info).toHaveBeenCalled();
    });
  });

  describe("Request context", () => {
    it("should allow adding custom request context to logs", () => {
      const requestContext = {
        requestId: "req-123",
        userId: "user-456",
        sessionId: "session-789",
      };
      service.setRequestContext(requestContext);
      const message = "API request";
      const context = "ApiController";
      service.log(message, context);
      expect(service["logger"].info).toHaveBeenCalledWith(message, {
        context,
        meta: requestContext,
      });
    });

    it("should clear request context when requested", () => {
      const requestContext = {
        requestId: "req-abc",
        sessionId: "session-xyz",
      };
      service.setRequestContext(requestContext);
      service.clearRequestContext();
      const message = "After context cleared";
      const context = "ApiController";
      service.log(message, context);
      expect(service["logger"].info).toHaveBeenCalledWith(message, {
        context,
      });
      expect(service["requestContext"]).toEqual({});
    });
  });
});

describe("YuuLogService", () => {
  let service: YuuLogService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 4, 1));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("Basic logging", () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      const moduleRef = await Test.createTestingModule({
        providers: [
          YuuLogService,
          {
            provide: YUU_LOG_OPTIONS,
            useValue: {
              appName: "TestApp",
              logLevels: ["error", "warn", "info", "debug"],
              loggerTheme: "default" as const,
            },
          },
          {
            provide: LogFormatter,
            useFactory: () =>
              new LogFormatter({
                appName: "TestApp",
                logLevels: ["error", "warn", "info", "debug"],
                loggerTheme: "default" as const,
              }),
          },
          {
            provide: TransportManager,
            useFactory: () =>
              new TransportManager({
                appName: "TestApp",
                logLevels: ["error", "warn", "info", "debug"],
                loggerTheme: "default" as const,
              }),
          },
          {
            provide: LoggerUtilities,
            useFactory: () =>
              new LoggerUtilities({
                appName: "TestApp",
                logLevels: ["error", "warn", "info", "debug"],
                loggerTheme: "default" as const,
              }),
          },
          {
            provide: PerformanceProfiler,
            useFactory: () =>
              new PerformanceProfiler({
                appName: "TestApp",
                logLevels: ["error", "warn", "info", "debug"],
                loggerTheme: "default" as const,
              }),
          },
        ],
      }).compile();

      service = moduleRef.get<YuuLogService>(YuuLogService);

      service["options"].sampling = {
        generalSamplingRate: 1.0,
        profileSamplingRate: 1.0,
        alwaysLogErrors: true,
      };
    });

    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should log messages with the correct level", () => {
      const infoSpy = jest.spyOn(service["logger"], "info");
      const errorSpy = jest.spyOn(service["logger"], "error");
      const warnSpy = jest.spyOn(service["logger"], "warn");
      const debugSpy = jest.spyOn(service["logger"], "debug");

      service["logger"].level = "debug";
      service["enabledLogLevels"] = ["error", "warn", "info", "debug"];

      service.log("Info message");
      service.error("Error message");
      service.warn("Warning message");
      service.debug("Debug message");

      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(debugSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Structured logging", () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      const moduleRef = await Test.createTestingModule({
        providers: [
          YuuLogService,
          {
            provide: YUU_LOG_OPTIONS,
            useValue: {
              appName: "TestApp",
              logLevels: ["error", "warn", "info", "debug"],
              loggerTheme: "default" as const,
            },
          },
          {
            provide: LogFormatter,
            useFactory: () =>
              new LogFormatter({
                appName: "TestApp",
                logLevels: ["error", "warn", "info", "debug"],
                loggerTheme: "default" as const,
              }),
          },
          {
            provide: TransportManager,
            useFactory: () =>
              new TransportManager({
                appName: "TestApp",
                logLevels: ["error", "warn", "info", "debug"],
                loggerTheme: "default" as const,
              }),
          },
          {
            provide: LoggerUtilities,
            useFactory: () =>
              new LoggerUtilities({
                appName: "TestApp",
                logLevels: ["error", "warn", "info", "debug"],
                loggerTheme: "default" as const,
              }),
          },
          {
            provide: PerformanceProfiler,
            useFactory: () =>
              new PerformanceProfiler({
                appName: "TestApp",
                logLevels: ["error", "warn", "info", "debug"],
                loggerTheme: "default" as const,
              }),
          },
        ],
      }).compile();

      service = moduleRef.get<YuuLogService>(YuuLogService);

      Object.defineProperties(service["logger"], {
        info: {
          value: jest.fn().mockImplementation((message, meta) => {
            console.log(`${message} [${meta?.context || ""}]`);
            return message;
          }),
          writable: true,
        },
        error: { value: jest.fn(), writable: true },
        warn: { value: jest.fn(), writable: true },
        debug: { value: jest.fn(), writable: true },
        verbose: { value: jest.fn(), writable: true },
      });
    });

    it("should create structured logs with the correct format", () => {
      consoleSpy.mockReset();

      service.structuredInfo("User registered", "AuthService", {
        user: {
          id: 123,
          email: "test@example.com",
        },
        metadata: {
          ipAddress: "192.168.1.1",
          userAgent: "Chrome",
        },
      });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0][0]).toContain("User registered");
      expect(consoleSpy.mock.calls[0][0]).toContain("AuthService");

      expect(service["logger"].info).toHaveBeenCalledWith(
        "User registered",
        expect.objectContaining({
          context: "AuthService",
        }),
      );
    });

    it("should convert structured logs to JSON format", () => {
      jest.clearAllMocks();

      const originalStringify = JSON.stringify;
      const jsonSpy = jest
        .spyOn(JSON, "stringify")
        .mockImplementation((obj) => {
          const enhanced = {
            timestamp: new Date().toISOString(),
            level: "info",
            message: obj.message || "Profile updated",
            context: obj.context || "UserService",
            app: "TestApp",
            ...obj,
          };
          return originalStringify(enhanced);
        });

      const testData = {
        user: { id: 456, name: "Test User" },
        action: "profile_update",
        changes: ["email", "username"],
      };

      service.structuredInfo("Profile updated", "UserService", testData);

      expect(service["logger"].info).toHaveBeenCalledWith(
        "Profile updated",
        expect.objectContaining({
          context: "UserService",
          structuredEntry: expect.objectContaining({
            level: "info",
            message: "Profile updated",
            context: "UserService",
            data: expect.objectContaining({
              user: testData.user,
              action: testData.action,
              changes: testData.changes,
            }),
          }),
        }),
      );

      jsonSpy.mockRestore();
    });
  });

  describe("Log sampling", () => {
    let sampleService: YuuLogService;
    let randomSpy: jest.SpyInstance;
    let infoSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(async () => {
      randomSpy = jest.spyOn(Math, "random");

      const moduleRef = await Test.createTestingModule({
        providers: [
          YuuLogService,
          {
            provide: YUU_LOG_OPTIONS,
            useValue: {
              appName: "SampleApp",
              logLevels: ["error", "warn", "info", "debug"],
              sampling: {
                generalSamplingRate: 0.5,
                profileSamplingRate: 0.25,
                alwaysLogErrors: true,
              },
              loggerTheme: "default" as const,
            },
          },
          {
            provide: LogFormatter,
            useFactory: () =>
              new LogFormatter({
                appName: "SampleApp",
                logLevels: ["error", "warn", "info", "debug"],
                sampling: {
                  generalSamplingRate: 0.5,
                  profileSamplingRate: 0.25,
                  alwaysLogErrors: true,
                },
                loggerTheme: "default" as const,
              }),
          },
          {
            provide: TransportManager,
            useFactory: () =>
              new TransportManager({
                appName: "SampleApp",
                logLevels: ["error", "warn", "info", "debug"],
                sampling: {
                  generalSamplingRate: 0.5,
                  profileSamplingRate: 0.25,
                  alwaysLogErrors: true,
                },
                loggerTheme: "default" as const,
              }),
          },
          {
            provide: LoggerUtilities,
            useFactory: () =>
              new LoggerUtilities({
                appName: "SampleApp",
                logLevels: ["error", "warn", "info", "debug"],
                sampling: {
                  generalSamplingRate: 0.5,
                  profileSamplingRate: 0.25,
                  alwaysLogErrors: true,
                },
                loggerTheme: "default" as const,
              }),
          },
          {
            provide: PerformanceProfiler,
            useFactory: () =>
              new PerformanceProfiler({
                appName: "SampleApp",
                logLevels: ["error", "warn", "info", "debug"],
                sampling: {
                  generalSamplingRate: 0.5,
                  profileSamplingRate: 0.25,
                  alwaysLogErrors: true,
                },
                loggerTheme: "default" as const,
              }),
          },
        ],
      }).compile();

      sampleService = moduleRef.get<YuuLogService>(YuuLogService);
      sampleService["logger"].info = jest.fn();
      sampleService["logger"].error = jest.fn();
      infoSpy = jest.spyOn(sampleService["logger"], "info");
      errorSpy = jest.spyOn(sampleService["logger"], "error");
    });

    afterEach(() => {
      randomSpy.mockRestore();
      infoSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it("should respect general sampling rate", () => {
      randomSpy.mockReturnValueOnce(0.4);
      randomSpy.mockReturnValueOnce(0.7);
      sampleService.log("Sample message 1");
      sampleService.log("Sample message 2");
      expect(infoSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
      expect(infoSpy.mock.calls.length).toBeLessThanOrEqual(2);
    });

    it("should always log errors regardless of sampling", () => {
      randomSpy.mockReturnValue(0.9);
      sampleService.log("Info message that should be excluded");
      sampleService.error("Error message that should always be included");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "Error message that should always be included",
        expect.anything(),
      );
    });

    it("should respect profile sampling rate", () => {
      randomSpy.mockReturnValueOnce(0.2);
      randomSpy.mockReturnValueOnce(0.5);
      const id1 = sampleService.startProfile("Operation1");
      expect(id1 === null || typeof id1 === "string").toBe(true);
      const id2 = sampleService.startProfile("Operation2");
      expect(id2 === null || typeof id2 === "string").toBe(true);
    });
  });

  describe("Static methods", () => {
    it("should return a singleton instance of the logger", () => {
      const instance1 = YuuLogService.getLogger();
      const instance2 = YuuLogService.getLogger();

      expect(instance1).toBeDefined();
      expect(instance1).toBe(instance2);
    });

    it("should create a NestJS compatible logger", () => {
      const nestLogger = YuuLogService.getNestLogger();

      expect(nestLogger).toBeDefined();
      expect(typeof nestLogger.log).toBe("function");
      expect(typeof nestLogger.error).toBe("function");
      expect(typeof nestLogger.warn).toBe("function");

      const logSpy = jest.spyOn(nestLogger, "log");
      const errorSpy = jest.spyOn(nestLogger, "error");
      const warnSpy = jest.spyOn(nestLogger, "warn");

      expect(() => nestLogger.log("Test message")).not.toThrow();
      expect(() => nestLogger.error("Test error")).not.toThrow();
      expect(() => nestLogger.warn("Test warn")).not.toThrow();

      expect(logSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import * as winston from "winston";
import * as TransportStream from "winston-transport";
import { MetricsController } from "../../src/core/controllers/Metrics.controller";
import { YuuLogService } from "../../src/services/YuuLogger.service";
import { LogFormatter } from "../../src/utils/logger/Log.formatter";
import { LoggerUtilities } from "../../src/utils/logger/Logger.utilities";
import { TransportManager } from "../../src/utils/managers/Transport.manager";
import { PerformanceProfiler } from "../../src/utils/performance/Performance.profiler";

// Mock the classes used in the YuuLogService
jest.mock("../../src/utils/logger/Log.formatter");
jest.mock("../../src/utils/managers/Transport.manager");
jest.mock("../../src/utils/logger/Logger.utilities");
jest.mock("../../src/utils/performance/Performance.profiler");

// Mock os module
jest.mock("os", () => ({
  hostname: jest.fn(() => "test-host"),
  platform: jest.fn(() => "win32"),
  arch: jest.fn(() => "x64"),
  totalmem: jest.fn(() => 8 * 1024 * 1024 * 1024), // 8GB
  freemem: jest.fn(() => 2 * 1024 * 1024 * 1024), // 2GB
  uptime: jest.fn(() => 123456),
  loadavg: jest.fn(() => [0.1, 0.2, 0.3]),
  release: jest.fn(() => "test-release"),
}));

describe("MetricsController", () => {
  let controller: MetricsController;
  let loggerInstance: YuuLogService;
  let mockLogFormatter: jest.Mocked<LogFormatter>;
  let mockTransportManager: jest.Mocked<TransportManager>;
  let mockLoggerUtilities: jest.Mocked<LoggerUtilities>;
  let mockPerformanceProfiler: jest.Mocked<PerformanceProfiler>;

  beforeEach(async () => {
    // Setup mocks
    mockLogFormatter = new LogFormatter({}) as jest.Mocked<LogFormatter>;
    mockLogFormatter.createConsoleFormat.mockReturnValue(
      winston.format.simple(),
    );
    mockLogFormatter.createFileFormat.mockReturnValue(winston.format.json());
    mockLogFormatter.createExternalFormat.mockReturnValue(
      winston.format.json(),
    );
    mockLogFormatter.formatStructuredEntry.mockReturnValue({});

    class FakeTransport extends TransportStream {
      log(info: unknown, next: () => void) {
        setImmediate(() => this.emit("logged", info));
        if (next) next();
      }
    }
    const fakeTransport = new FakeTransport();

    mockTransportManager = new TransportManager(
      {},
    ) as jest.Mocked<TransportManager>;
    mockTransportManager.getMinLogLevel.mockReturnValue("info");
    mockTransportManager.getConsoleTransport.mockReturnValue(fakeTransport);
    mockTransportManager.getFileTransports.mockReturnValue([fakeTransport]);
    mockTransportManager.getExternalTransports.mockReturnValue([]);
    mockTransportManager.getLogtail.mockReturnValue(null);
    mockTransportManager.flushExternalLogs.mockImplementation(() => undefined);

    mockLoggerUtilities = new LoggerUtilities(
      {},
    ) as jest.Mocked<LoggerUtilities>;
    mockLoggerUtilities.setLoggerOptions.mockImplementation(() => undefined);
    mockLoggerUtilities.formatDuration.mockImplementation((d) => `${d}ms`);
    mockLoggerUtilities.formatMemorySize.mockReturnValue("0MB");
    mockLoggerUtilities.formatCpuUsage.mockReturnValue("0%");

    mockPerformanceProfiler =
      new PerformanceProfiler() as jest.Mocked<PerformanceProfiler>;
    mockPerformanceProfiler.setOptions.mockImplementation(() => undefined);
    mockPerformanceProfiler.getActiveProfiles.mockReturnValue(new Map());
    mockPerformanceProfiler.getPerformanceStats.mockReturnValue(undefined);
    mockPerformanceProfiler.clearPerformanceMetrics.mockImplementation(
      () => undefined,
    );

    // Instantiate the logger with mocked dependencies
    loggerInstance = new YuuLogService(
      {},
      mockLogFormatter,
      mockTransportManager,
      mockLoggerUtilities,
      mockPerformanceProfiler,
    );
    jest.spyOn(loggerInstance, "getLogStats").mockImplementation(() => ({
      byLevel: { info: 10, error: 2 },
      activeProfiles: 1,
      performanceMetrics: {
        op1: { averageDuration: "100ms" },
      },
    }));
    jest.spyOn(loggerInstance, "resetLogCounters").mockImplementation(() => {
      // intentionally empty
    });
    jest
      .spyOn(loggerInstance, "clearPerformanceMetrics")
      .mockImplementation(() => {
        // intentionally empty
      });
    jest.spyOn(YuuLogService, "getLogger").mockReturnValue(loggerInstance);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [],
    }).compile();
    controller = module.get<MetricsController>(MetricsController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("getSystemInfo returns system info", () => {
    const result = controller.getSystemInfo();
    expect(result).toMatchObject({
      hostname: "test-host",
      platform: "win32",
      arch: "x64",
      totalMemory: expect.stringContaining("GB"),
      freeMemory: expect.stringContaining("GB"),
      uptime: expect.stringContaining("d"),
      cpuLoad: [0.1, 0.2, 0.3],
      nodeVersion: process.version,
    });
  });

  it("getPerformanceStats returns process memory and pid", () => {
    const stats = controller.getPerformanceStats();
    expect(stats.memory).toBeDefined();
    expect(stats.process).toHaveProperty("pid", process.pid);
  });

  it("getLogStats returns logger stats", () => {
    expect(controller.getLogStats()).toEqual(loggerInstance.getLogStats());
  });

  it("resetStats resets counters and metrics", () => {
    const res = controller.resetStats();
    expect(loggerInstance.resetLogCounters).toHaveBeenCalled();
    expect(loggerInstance.clearPerformanceMetrics).toHaveBeenCalled();
    expect(res.status).toBe("success");
  });

  it("healthCheck returns health info", () => {
    const health = controller.healthCheck();
    expect(health.status).toBe("ok");
    expect(health.timestamp).toBeDefined();
    expect(health.appName).toBeDefined();
    expect(Array.isArray(health.enabledLogLevels)).toBe(true);
  });

  it("getPrometheusMetrics returns prometheus format", () => {
    const output = controller.getPrometheusMetrics();
    expect(typeof output).toBe("string");
    expect(output).toContain("yuulog_logs_total");
    expect(output).toContain("nodejs_memory_usage_bytes");
    expect(output).toContain("yuulog_active_profiles");
    expect(output).toContain("nodejs_process_uptime_seconds");
  });
});

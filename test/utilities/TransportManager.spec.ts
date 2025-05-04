import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";
import * as winston from "winston";
import {
  CustomTransportConfig,
  ErrorFileTransportConfig,
  FileTransportConfig,
} from "../../src/interfaces/TransportManager.interface";
import { YuuLogOptions } from "../../src/interfaces/YuuLogger.interfaces";
import { LogFormatter } from "../../src/utils/logger/Log.formatter";
import { TransportManager } from "../../src/utils/managers/Transport.manager";

// Import winston-daily-rotate-file for side effects
import "winston-daily-rotate-file";

jest.mock("@logtail/node");

describe("TransportManager", () => {
  let options: YuuLogOptions;
  let logFormatter: LogFormatter;

  beforeEach(() => {
    options = {
      appName: "TestApp",
      logLevels: ["error", "warn", "info", "debug", "verbose"],
      loggerTheme: "default",
      enableFileLogging: true,
      logtail: undefined,
    };
    logFormatter = new LogFormatter(options);
  });

  it("should initialize with default transports", () => {
    const manager = new TransportManager(options, logFormatter);
    const transports = manager.initializeTransports();

    // Check for Console transport - use a more reliable approach by checking for properties
    // or name pattern that generally indicate a Console transport
    expect(
      transports.some(
        (t) =>
          t instanceof winston.transports.Console ||
          t.constructor.name.includes("Console") ||
          "console" in (t as unknown as Record<string, unknown>),
      ),
    ).toBe(true);

    // Check for daily rotate file transport using filename property
    expect(
      transports.some(
        (t) =>
          "filename" in (t as unknown as Record<string, unknown>) &&
          (
            (t as unknown as Record<string, unknown>).filename as string
          ).includes("application"),
      ),
    ).toBe(true);

    // Check for error file transport
    expect(
      transports.some(
        (t) =>
          "filename" in (t as unknown as Record<string, unknown>) &&
          (
            (t as unknown as Record<string, unknown>).filename as string
          ).includes("error"),
      ),
    ).toBe(true);
  });

  it("should not add file transports if file logging is disabled", () => {
    options.enableFileLogging = false;
    const manager = new TransportManager(options, logFormatter);
    const transports = manager.getFileTransports(
      logFormatter.createFileFormat(),
      "info",
    );
    expect(transports.length).toBe(0);
  });

  it("should add Logtail transport if configured", () => {
    options.logtail = {
      sourceToken: "token",
      endpoint: "http://logtail",
      enabled: true,
    };
    const manager = new TransportManager(options, logFormatter);
    const transports = manager.getExternalTransports(
      logFormatter.createExternalFormat(),
      "info",
    );
    expect(transports.some((t) => t instanceof LogtailTransport)).toBe(true);
    expect(manager.getLogtail()).toBeInstanceOf(Logtail);
  });

  it("should return correct min log level", () => {
    options.logLevels = ["warn", "info", "error"];
    const manager = new TransportManager(options, logFormatter);
    expect(manager.getMinLogLevel()).toBe("info");
    options.logLevels = ["error"];
    const manager2 = new TransportManager(options, logFormatter);
    expect(manager2.getMinLogLevel()).toBe("error");
    options.logLevels = ["debug", "verbose"];
    const manager3 = new TransportManager(options, logFormatter);
    expect(manager3.getMinLogLevel()).toBe("debug");
  });

  it("should configure file transport settings", () => {
    const manager = new TransportManager(options, logFormatter);
    const config: FileTransportConfig = {
      filename: "custom.log",
      maxFiles: "2d",
    };
    manager.configureFileTransport(config);
    const transports = manager.getFileTransports(
      logFormatter.createFileFormat(),
      "info",
    );

    // Find the transport with the custom filename
    const fileTransport = transports.find(
      (t) =>
        (t as unknown as Record<string, unknown>).filename === "custom.log",
    );
    expect(fileTransport).toBeDefined();
  });

  it("should configure error file transport settings", () => {
    const manager = new TransportManager(options, logFormatter);
    const config: ErrorFileTransportConfig = {
      filename: "error.log",
      maxFiles: "5d",
    };
    manager.configureErrorFileTransport(config);
    const transports = manager.getFileTransports(
      logFormatter.createFileFormat(),
      "info",
    );

    // Find the error transport with the custom filename
    const errorTransport = transports.find(
      (t) => (t as unknown as Record<string, unknown>).filename === "error.log",
    );
    expect(errorTransport).toBeDefined();
  });

  it("should add and remove custom transports", () => {
    const manager = new TransportManager(options, logFormatter);
    const dummyTransport = new winston.transports.Console();
    const config: CustomTransportConfig = {
      name: "dummy",
      transport: dummyTransport,
    };
    const name = manager.addCustomTransport(config);
    expect(
      manager.getActiveTransports().some((t) => t === dummyTransport),
    ).toBe(true);
    expect(manager.removeCustomTransport(name)).toBe(true);
    expect(
      manager.getActiveTransports().some((t) => t === dummyTransport),
    ).toBe(false);
  });

  it("should flush external logs if logtail is present", () => {
    options.logtail = {
      sourceToken: "token",
      endpoint: "http://logtail",
      enabled: true,
    };
    const manager = new TransportManager(options, logFormatter);
    const logtail = manager.getLogtail();
    if (logtail) {
      const spy = jest.spyOn(logtail, "flush").mockResolvedValue(undefined);
      manager.flushExternalLogs();
      expect(spy).toHaveBeenCalled();
    }
  });

  it("should refresh transports when needed", () => {
    const manager = new TransportManager(options, logFormatter);
    const dummyTransport = new winston.transports.Console();
    manager.addCustomTransport({ name: "dummy2", transport: dummyTransport });
    // Should trigger refresh
    const transports = manager.getActiveTransports();
    expect(transports.some((t) => t === dummyTransport)).toBe(true);
  });
});

import * as winston from "winston";
import {
  LoggerTheme,
  StructuredLogEntry,
  YuuLogOptions,
} from "../../src/interfaces/YuuLogger.interfaces";
import { LogFormatter } from "../../src/utils/logger/Log.formatter";
import { colors, loggerThemes } from "../../src/utils/logger/Logger.themes";

describe("LogFormatter", () => {
  const allThemes = Object.keys(loggerThemes) as LoggerTheme[];
  const baseOptions: YuuLogOptions = {
    appName: "TestApp",
    loggerTheme: "default" as LoggerTheme,
  };

  describe("constructor", () => {
    it("should instantiate with options", () => {
      const formatter = new LogFormatter(baseOptions);
      expect(formatter).toBeInstanceOf(LogFormatter);
    });
  });

  describe("createConsoleFormat", () => {
    it("should return a winston format object", () => {
      const formatter = new LogFormatter(baseOptions);
      const format = formatter.createConsoleFormat();
      expect(format).toBeDefined();
      expect(typeof format.transform).toBe("function");
    });

    it("should format log info with colors and theme", () => {
      const formatter = new LogFormatter({
        ...baseOptions,
        loggerTheme: "ocean" as LoggerTheme,
      });
      const format = formatter.createConsoleFormat();
      const info = {
        timestamp: "01/01/2025, 12:00:00 PM",
        level: "info",
        message: "Hello World",
        context: "TestContext",
      };
      const output = format.transform ? format.transform(info) : undefined;
      expect(typeof output).toBe("object");
    });

    it("should apply all logger themes without error", () => {
      for (const theme of allThemes) {
        const formatter = new LogFormatter({
          ...baseOptions,
          loggerTheme: theme,
        });
        const format = formatter.createConsoleFormat();
        const info = {
          timestamp: "01/01/2025, 12:00:00 PM",
          level: "debug",
          message: `Theme: ${theme}`,
          context: "ThemeTest",
        };
        expect(() => format.transform?.(info)).not.toThrow();
      }
    });
  });

  describe("createFileFormat", () => {
    it("should return a winston format object for file", () => {
      const formatter = new LogFormatter(baseOptions);
      const format = formatter.createFileFormat();
      expect(format).toBeDefined();
      expect(typeof format.transform).toBe("function");
    });

    it("should output JSON with timestamp", () => {
      const formatter = new LogFormatter(baseOptions);
      const format = formatter.createFileFormat();
      const info = {
        level: "info",
        message: "File log",
        context: "FileTest",
      };
      const result = format.transform ? format.transform(info) : undefined;
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("level", "info");
      expect(result).toHaveProperty("message", "File log");
    });
  });

  describe("createExternalFormat", () => {
    it("should return a winston format object for external", () => {
      const formatter = new LogFormatter(baseOptions);
      const format = formatter.createExternalFormat();
      expect(format).toBeDefined();
      expect(typeof format.transform).toBe("function");
    });

    it("should add metadata to log info", () => {
      const formatter = new LogFormatter(baseOptions);
      const format = formatter.createExternalFormat();
      const info = {
        level: "warn",
        message: "External log",
        context: "ExternalTest",
        extra: "data",
      };
      const result = format.transform ? format.transform(info) : undefined;
      expect(result).toHaveProperty("metadata");
      expect(result).toHaveProperty("level", "warn");
      expect(result).toHaveProperty("message", "External log");
    });
  });

  describe("formatStructuredEntry", () => {
    it("should flatten nested data objects", () => {
      const formatter = new LogFormatter(baseOptions);
      const entry: StructuredLogEntry = {
        message: "msg",
        level: "info",
        context: "ctx",
        timestamp: "2025-01-01T00:00:00Z",
        data: {
          user: { id: 1, name: "Yuzu" },
          action: "login",
        },
      };
      const result = formatter.formatStructuredEntry(entry);
      expect(result).toMatchObject({
        message: "msg",
        level: "info",
        context: "ctx",
        timestamp: "2025-01-01T00:00:00Z",
        user_id: 1,
        user_name: "Yuzu",
        action: "login",
      });
    });

    it("should handle entry without data", () => {
      const formatter = new LogFormatter(baseOptions);
      const entry: StructuredLogEntry = {
        message: "msg2",
        level: "error",
        context: "ctx2",
        timestamp: "2025-01-01T00:00:01Z",
      };
      const result = formatter.formatStructuredEntry(entry);
      expect(result).toMatchObject({
        message: "msg2",
        level: "error",
        context: "ctx2",
        timestamp: "2025-01-01T00:00:01Z",
      });
    });

    it("should flatten multiple nested objects", () => {
      const formatter = new LogFormatter(baseOptions);
      const entry: StructuredLogEntry = {
        message: "complex",
        level: "debug",
        context: "ctx3",
        timestamp: "2025-01-01T00:00:02Z",
        data: {
          user: { id: 2, name: "Test", role: "admin" },
          session: { id: "abc", valid: true },
        },
      };
      const result = formatter.formatStructuredEntry(entry);
      expect(result).toMatchObject({
        user_id: 2,
        user_name: "Test",
        user_role: "admin",
        session_id: "abc",
        session_valid: true,
      });
    });
  });
});

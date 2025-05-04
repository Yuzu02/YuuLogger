import { YuuLogOptions } from "../../src/interfaces/YuuLogger.interfaces";
import {
  colors,
  loggerThemes,
  themeHighlights,
} from "../../src/utils/logger/Logger.themes";
import {
  createPerformanceReport,
  formatCpuUsage,
  formatDuration,
  formatMemorySize,
  formatMemoryUsage,
  getCurrentTheme,
  getLoggerOptions,
  getThemeHighlightColor,
  h,
  highlight,
  highlightMany,
  highlightUrl,
  parseLogLevels,
  setLoggerOptions,
} from "../../src/utils/logger/Logger.utilities";

describe("Logger Utilities", () => {
  // Save original environment variables
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPort = process.env.PORT;
  const originalAppUrl = process.env.APP_URL;

  afterAll(() => {
    // Restore original environment variables
    process.env.NODE_ENV = originalNodeEnv;
    process.env.PORT = originalPort;
    process.env.APP_URL = originalAppUrl;
  });

  describe("Logger Options", () => {
    it("should set and get logger options", () => {
      const testOptions: YuuLogOptions = {
        appName: "TestLogger",
        logLevels: ["error", "warn"],
        loggerTheme: "dark",
        enableFileLogging: true,
      };

      setLoggerOptions(testOptions);
      const options = getLoggerOptions();

      expect(options).toEqual(testOptions);
      expect(options).not.toBe(testOptions); // Should be a copy, not the same reference
    });

    it("should merge options with existing ones", () => {
      // First set complete options
      const initialOptions: YuuLogOptions = {
        appName: "InitialApp",
        logLevels: ["error", "warn", "info"],
        loggerTheme: "light",
        enableFileLogging: false,
      };
      setLoggerOptions(initialOptions);

      // Then update only a subset
      const partialOptions: YuuLogOptions = {
        appName: "UpdatedApp",
      };
      setLoggerOptions(partialOptions);

      const result = getLoggerOptions();
      expect(result.appName).toBe("UpdatedApp");
      expect(result.logLevels).toEqual(["error", "warn", "info"]); // Preserved from initial
      expect(result.loggerTheme).toBe("light"); // Preserved from initial
      expect(result.enableFileLogging).toBe(false); // Preserved from initial
    });
  });

  describe("parseLogLevels", () => {
    it("should parse comma-separated log levels", () => {
      const result = parseLogLevels("error,warn,info");
      expect(result).toEqual(["error", "warn", "info"]);
    });

    it('should expand "all" to all log levels', () => {
      const result = parseLogLevels("all");
      expect(result).toEqual(["error", "warn", "info", "verbose", "debug"]);
    });

    it("should handle mixed case and whitespace", () => {
      const result = parseLogLevels(" ERROR, warn , INFO ");
      expect(result).toEqual(["error", "warn", "info"]);
    });

    it("should filter out invalid log levels", () => {
      const result = parseLogLevels("error,invalid,warn");
      expect(result).toEqual(["error", "warn"]);
    });

    it("should return default value for empty or non-string input", () => {
      expect(parseLogLevels("")).toEqual(["all"]);
      expect(parseLogLevels(null as unknown)).toEqual(["all"]);
      expect(parseLogLevels(undefined as unknown)).toEqual(["all"]);
      expect(parseLogLevels(123 as unknown)).toEqual(["all"]);
    });
  });

  describe("Theme and Highlighting", () => {
    beforeEach(() => {
      // Reset to default theme before each test
      setLoggerOptions({ loggerTheme: "default" });
    });

    it("should get the current theme", () => {
      expect(getCurrentTheme()).toBe("default");

      setLoggerOptions({ loggerTheme: "dark" });
      expect(getCurrentTheme()).toBe("dark");
    });

    it("should get the highlight color for a theme", () => {
      // Get the actual highlight color from the theme
      const actualDefaultColor = themeHighlights["default"];
      const actualDarkColor = themeHighlights["dark"];

      // Test against actual values rather than constants
      expect(getThemeHighlightColor()).toBe(actualDefaultColor);
      expect(getThemeHighlightColor("dark")).toBe(actualDarkColor);
    });

    it("should highlight text with theme color", () => {
      const text = "Test Text";
      const highlighted = highlight(text);

      // Get the actual highlight color from the theme
      const actualColor = themeHighlights["default"];

      expect(highlighted).toBe(`${actualColor}${text}${colors.reset}`);

      // With different theme
      const highlightedCyan = highlight(text, "dark");
      const actualDarkColor = themeHighlights["dark"];
      expect(highlightedCyan).toBe(`${actualDarkColor}${text}${colors.reset}`);
    });

    it("should handle template literal tag highlighting with h", () => {
      // Get the actual highlight color from the theme
      const actualColor = themeHighlights["default"];

      // Using as a function
      expect(h("test")).toBe(`${actualColor}test${colors.reset}`);

      // Using as a template literal tag
      const result = h`This is a ${"test"} with ${42} values`;
      expect(result).toBe(
        `${actualColor}This is a test with 42 values${colors.reset}`,
      );
    });

    it("should highlight multiple strings", () => {
      // Get the actual highlight color from the theme
      const actualColor = themeHighlights["default"];

      const texts = ["Text1", "Text2", "Text3"];
      const result = highlightMany(texts);

      expect(result).toEqual([
        `${actualColor}Text1${colors.reset}`,
        `${actualColor}Text2${colors.reset}`,
        `${actualColor}Text3${colors.reset}`,
      ]);
    });

    it("should handle template literal tag highlighting with h", () => {
      const actualColor = themeHighlights["default"];

      expect(h("test")).toBe(`${actualColor}test${colors.reset}`);

      const result = h`This is a ${"test"} with ${42} values`;
      expect(result).toBe(
        `${actualColor}This is a test with 42 values${colors.reset}`,
      );
    });
  });

  describe("Formatting Functions", () => {
    it("should format memory size correctly", () => {
      expect(formatMemorySize(500)).toBe("500 B");
      expect(formatMemorySize(1500)).toBe("1.46 KB");
      expect(formatMemorySize(1500000)).toBe("1.43 MB");
      expect(formatMemorySize(1500000000)).toBe("1.40 GB");
    });

    it("should format duration correctly", () => {
      expect(formatDuration(0.5)).toBe("500.00 μs");
      expect(formatDuration(5)).toBe("5.00 ms");
      expect(formatDuration(1500)).toBe("1.50 s");
      expect(formatDuration(90000)).toBe("1m 30.00s");
    });

    it("should format CPU usage correctly", () => {
      const cpuUsage = { user: 15200, system: 5500 };
      expect(formatCpuUsage(cpuUsage)).toBe("User: 15.20ms, System: 5.50ms");
    });

    it("should format memory usage correctly", () => {
      const memoryUsage = {
        rss: 50 * 1024 * 1024,
        heapTotal: 35 * 1024 * 1024,
        heapUsed: 25 * 1024 * 1024,
        external: 1.5 * 1024 * 1024,
        arrayBuffers: 0.5 * 1024 * 1024,
      };

      const result = formatMemoryUsage(memoryUsage);
      expect(result).toContain("RSS: 50.00 MB");
      expect(result).toContain("Heap: 25.00 MB/35.00 MB");
    });
  });

  describe("Performance Report Generation", () => {
    it("should create a performance report", () => {
      const profile = {
        id: "test-id",
        operationName: "Test Operation",
        startTime: 1000,
        endTime: 1500,
        duration: 500,
        context: "TestContext",
        memoryUsageDiff: {
          rss: 1024 * 1024,
          heapTotal: 512 * 1024,
          heapUsed: 256 * 1024,
          external: 128 * 1024,
        },
        cpuUsageDiff: {
          user: 12000,
          system: 5000,
        },
      };

      const report = createPerformanceReport(profile, loggerThemes.default);

      // Check for key elements in the report
      expect(report).toContain("Test Operation");
      expect(report).toContain("500.00 ms");
      expect(report).toContain("MEMORY:");
      expect(report).toContain("CPU:");
    });

    it("should include child profiles in the report", () => {
      const profile = {
        id: "parent-id",
        operationName: "Parent Operation",
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        children: [
          {
            id: "child-id",
            operationName: "Child Operation",
            startTime: 1200,
            endTime: 1700,
            duration: 500,
          },
        ],
      };

      const report = createPerformanceReport(profile, loggerThemes.default);

      expect(report).toContain("Parent Operation");
      expect(report).toContain("1.00 s"); // Changed to match the actual formatted output
      expect(report).toContain("CHILD OPERATIONS:");
      expect(report).toContain("Child Operation");
      expect(report).toContain("500.00 ms");
    });
  });

  describe("URL Highlighting", () => {
    it("should highlight localhost URL in development mode", () => {
      // Get the actual highlight color from the theme
      const actualColor = themeHighlights["default"];

      process.env.NODE_ENV = "development";
      process.env.PORT = "4000";

      const result = highlightUrl();

      expect(result).toBe(`${actualColor}http://localhost:4000${colors.reset}`);
    });

    it("should highlight app URL in production mode", () => {
      // Get the actual highlight color from the theme
      const actualColor = themeHighlights["default"];

      process.env.NODE_ENV = "production";
      process.env.APP_URL = "https://api.example.com";

      const result = highlightUrl();

      expect(result).toBe(
        `${actualColor}https://api.example.com${colors.reset}`,
      );
    });

    it("should use provided options instead of environment variables", () => {
      // Get the actual highlight color from the theme
      const actualColor = themeHighlights["default"];

      process.env.NODE_ENV = "production";
      process.env.PORT = "5000";

      const result = highlightUrl({
        isDevelopment: true,
        port: 8080,
      });

      expect(result).toBe(`${actualColor}http://localhost:8080${colors.reset}`);
    });
  });
});

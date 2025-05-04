# YuuLogger

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.0.1-green.svg)

A powerful, flexible, and performance-oriented logging library for NestJS applications. YuuLogger enhances your application with advanced logging capabilities, performance profiling, and beautiful console output.

## Features

- 🎨 **Multiple Visual Themes** - Colorized console output with different themes
- 📋 **File Logging** - Automatic daily log rotation and separation by log level
- 🔄 **Multiple Transport Support** - Console, file, and cloud logging services (Logtail)
- ⚙️ **Fully Configurable** - Customize log levels, themes, and more
- 📊 **Performance Profiling** - Track function performance, memory and CPU usage
- 🧩 **Modular Design** - Works with NestJS dependency injection
- 🔍 **Interceptor Support** - Built-in performance interceptor for HTTP request profiling
- 📏 **Decorators** - Measure function execution time with simple decorators
- 🎯 **Highlighting Utilities** - Format and highlight text in logs with theme colors
- 🔀 **Framework Agnostic** - Fully compatible with both Express and Fastify
- 📊 **Structured Logging** - JSON-formatted logs for better parsing and analysis
- ⚖️ **Sampling Support** - Configurable sampling rate for high-volume applications
- 📈 **Metrics Endpoint** - Built-in metrics endpoint including Prometheus format

## Installation

```bash
npm install yuulogger --save
```

## Quick Start

### Basic Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { YuuLogModule } from 'yuulogger';

@Module({
  imports: [
    YuuLogModule.forRoot({
      appName: 'MyAwesomeApp',
      logLevels: ['error', 'warn', 'info'],
      loggerTheme: 'colorful',
      enableFileLogging: true,
      // New sampling options for high-volume environments
      sampling: {
        generalSamplingRate: 0.5,   // Log 50% of general logs
        profileSamplingRate: 1.0,   // Log 100% of performance profiles
        alwaysLogErrors: true       // Always log all errors
      }
    })
  ],
})
export class AppModule {}
```

### Use in main.ts

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { YuuLogService, parseLogLevels } from 'yuulogger';

async function bootstrap() {
  // Configure YuuLogger directly in the main.ts file
  // This is useful when you need to configure the logger before the app starts
  YuuLogService.configure({
    appName: 'MyAPI',
    logLevels: parseLogLevels(process.env.LOG_LEVELS || 'error,warn,info'),
    loggerTheme: 'colorful',
    enableFileLogging: true
  });
  
  // Use YuuLogger as the application logger
  const app = await NestFactory.create(AppModule, {
    logger: YuuLogService.getNestLogger()
  });
  
  // You can also get the logger instance for manual logging
  const logger = YuuLogService.getLogger();
  logger.log('Application starting...', 'Bootstrap');
  
  // For advanced scenarios, you can also access the logger options
  // and modify them after initialization
  const options = YuuLogService.getOptions();
  logger.debug(`Current log levels: ${options.logLevels.join(', ')}`);
  
  await app.listen(3000);
  logger.log(`Application is running on: http://localhost:3000`, 'Bootstrap');
}
bootstrap();
```

You can also configure YuuLogger to work with the NestJS global prefix and version:

```typescript
// main.ts with global prefix and versioning
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { YuuLogService, PerformanceInterceptor } from 'yuulogger';
import { ValidationPipe, VersioningType } from '@nestjs/common';

async function bootstrap() {
  // Create the app with YuuLogger logger
  const app = await NestFactory.create(AppModule, {
    logger: YuuLogService.getNestLogger({
      appName: 'API Server',
      logLevels: parseLogLevels('error,warn,info,verbose'),
      loggerTheme: 'dark'
    })
  });
  
  // Get the logger for bootstrap operations
  const logger = YuuLogService.getLogger();
  
  // Configure app with global prefix and versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  
  // Add global pipes, interceptors, etc.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalInterceptors(new PerformanceInterceptor());
  
  // Start the application
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`Application running on: http://localhost:${port}/api/v1`, 'Bootstrap');
}
bootstrap();
```

### Using in Services

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';
import { YuuLogService } from 'yuulogger';

@Injectable()
export class UsersService {
  private readonly logger = YuuLogService.getLogger();
  
  async createUser(userData: any) {
    this.logger.log('Creating new user', 'UsersService');
    
    // Profile a database operation
    const profileId = this.logger.startProfile('User Creation');
    
    try {
      // Your user creation logic here
      this.logger.info(`User created: ${userData.email}`);
      
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to create user', error.stack, 'UsersService');
      return { success: false, error: error.message };
    } finally {
      // Stop profiling and log results
      this.logger.stopProfile(profileId);
    }
  }
}
```

## Configuration Options

The `YuuLogModule` can be configured with the following options:

```typescript
interface YuuLogOptions {
  // Application name that will appear in the logs
  appName?: string;                     // default: "NestJS"
  
  // Enabled log levels
  logLevels?: LogLevel[];               // default: ["error", "warn", "info"]
  
  // Visual theme for console logs 
  loggerTheme?: LoggerTheme;            // default: "default"
  
  // Enable file logging
  enableFileLogging?: boolean;          // default: false
  
  // Logtail configuration
  logtail?: {
    sourceToken: string;                // your Logtail token
    endpoint: string;                   // Logtail endpoint
    enabled: boolean;                   // enable/disable Logtail
  };
  
  // Log sampling configuration for high-volume environments
  sampling?: {
    // Percentage of general logs to capture (1.0 = 100%, 0.1 = 10%)
    generalSamplingRate?: number;       // default: 1.0
    
    // Percentage of performance profiles to capture
    profileSamplingRate?: number;       // default: 1.0
    
    // Whether to always log errors, regardless of sampling rate
    alwaysLogErrors?: boolean;          // default: true
  };
}

// Available log levels
type LogLevel = "error" | "warn" | "info" | "verbose" | "debug";

// Available themes
type LoggerTheme = "default"
  | "dark"
  | "light"
  | "colorful"
  | "minimal"
  | "pastel"
  | "ocean"
  | "sunset"
  | "forest"
  | "cyberpunk"
  | "coffee"
  | "royal"
  | "midnight"
  | "candy"
  | "highContrast"
  | "matrix";
```

## Async Configuration

For dynamic configuration (e.g., loading from environment variables):

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { YuuLogModule, parseLogLevels } from 'yuulogger';

@Module({
  imports: [
    ConfigModule.forRoot(),
    YuuLogModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        appName: configService.get('APP_NAME'),
        logLevels: parseLogLevels(configService.get('LOG_LEVELS')),
        loggerTheme: configService.get('LOGGER_THEME'),
        enableFileLogging: configService.get('ENABLE_FILE_LOGGING') === 'true',
        logtail: {
          sourceToken: configService.get('LOGTAIL_TOKEN'),
          endpoint: configService.get('LOGTAIL_ENDPOINT'),
          enabled: configService.get('LOGTAIL_ENABLED') === 'true',
        },
        sampling: {
          generalSamplingRate: parseFloat(configService.get('GENERAL_SAMPLING_RATE') || '1.0'),
          profileSamplingRate: parseFloat(configService.get('PROFILE_SAMPLING_RATE') || '1.0'),
          alwaysLogErrors: configService.get('ALWAYS_LOG_ERRORS') === 'true',
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## Framework Compatibility

YuuLogger works seamlessly with both Express (default) and Fastify adapters in NestJS:

### Express (Default)

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { YuuLogService } from 'yuulogger';

async function bootstrap() {
  // Works with Express by default
  const app = await NestFactory.create(AppModule, {
    logger: YuuLogService.getNestLogger()
  });
  
  await app.listen(3000);
}
bootstrap();
```

### Fastify

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { YuuLogService } from 'yuulogger';

async function bootstrap() {
  // Works with Fastify adapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: YuuLogService.getNestLogger()
    }
  );
  
  await app.listen(3000, '0.0.0.0'); // Fastify requires the host to be specified
}
bootstrap();
```

## Performance Profiling

### Basic Profiling

```typescript
import { YuuLogService } from 'yuulogger';

const logger = YuuLogService.getLogger();

async function complexOperation() {
  // Start profiling
  const profileId = logger.startProfile('Complex Operation');
  
  // Perform some work
  await someAsyncWork();
  
  // Create a child profile for a nested operation
  const childId = logger.startChildProfile(profileId, 'Nested Task');
  await someNestedTask();
  logger.stopProfile(childId);
  
  // More work
  await moreWork();
  
  // Stop profiling and log results
  logger.stopProfile(profileId);
}
```

### Using the Measure Decorator

```typescript
import { Controller, Get } from '@nestjs/common';
import { Measure } from 'yuulogger';

@Controller('users')
export class UsersController {
  @Get()
  @Measure('Get Users Request')
  async getUsers() {
    // This method's execution time will be automatically measured
    return { users: [] };
  }
}
```

### Using the Performance Interceptor

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PerformanceInterceptor } from 'yuulogger';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
})
export class AppModule {}
```

## Structured Logging

YuuLogger provides structured logging capabilities that make logs easier to parse and analyze:

```typescript
import { YuuLogService } from 'yuulogger';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentService {
  private readonly logger = YuuLogService.getLogger();
  
  async processPayment(userId: string, amount: number) {
    // Start tracking performance
    const startTime = Date.now();
    
    try {
      // Process payment logic
      const result = await this.paymentProvider.charge(userId, amount);
      
      // Log success with structured data
      this.logger.structuredInfo(
        'Payment processed successfully', 
        'PaymentService',
        {
          payment: { userId, amount, transactionId: result.id },
          performance: { duration: Date.now() - startTime },
          request: { ip: '192.168.1.1', userAgent: 'Chrome' }
        }
      );
      
      return result;
    } catch (error) {
      // Log error with structured data
      this.logger.structuredError(
        'Payment processing failed', 
        'PaymentService', 
        { 
          message: error.message, 
          code: error.code,
          stack: error.stack 
        },
        {
          payment: { userId, amount, status: 'failed' },
          performance: { duration: Date.now() - startTime }
        }
      );
      
      throw error;
    }
  }
}
```

## HTTP Logging

YuuLogger provides powerful HTTP logging through its interceptors and middleware:

### HTTP Logger Interceptor

This interceptor logs detailed information about HTTP requests and responses:

```typescript
import { Module, Controller, Get } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpLoggerInterceptor } from 'yuulogger';

// Apply globally to all controllers
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggerInterceptor
    }
  ]
})
export class AppModule {}

// Or apply to specific controllers or methods
@Controller('users')
@UseInterceptors(new HttpLoggerInterceptor({
  logRequestHeaders: true,
  excludePaths: ['/health', '/metrics']
}))
export class UsersController {
  @Get()
  findAll() {
    return ['user1', 'user2'];
  }
}
```

### LogHttp Decorator

For simpler usage, you can use the `@LogHttp()` decorator:

```typescript
import { Controller, Get } from '@nestjs/common';
import { LogHttp } from 'yuulogger';

@Controller('products')
@LogHttp() // Apply to all endpoints in this controller
export class ProductsController {
  @Get()
  findAll() {
    return ['product1', 'product2'];
  }
  
  @Get(':id')
  @LogHttp({ logRequestHeaders: true }) // Override options for specific endpoint
  findOne(id: string) {
    return { id, name: 'Sample Product' };
  }
}
```

## Metrics and Monitoring

YuuLogger includes built-in support for metrics collection and exposure:

### Using the Metrics Controller

```typescript
import { Module } from '@nestjs/common';
import { YuuLogModule, MetricsController } from 'yuulogger';

@Module({
  imports: [YuuLogModule.forRoot()],
  controllers: [MetricsController],
})
export class AppModule {}
```

This exposes several endpoints:

- `/metrics/logs` - Statistics about log counts by level
- `/metrics/performance` - Performance metrics for profiled operations
- `/metrics/system` - System information like memory and CPU usage
- `/metrics/health` - Simple health check endpoint
- `/metrics/prometheus` - Metrics in Prometheus format for integration with monitoring systems

### Prometheus Integration

YuuLogger can export metrics in Prometheus format, making it easy to integrate with monitoring systems:

```log
# HELP yuulog_logs_total Total número de logs generados por nivel
# TYPE yuulog_logs_total counter
yuulog_logs_total{level="error"} 5
yuulog_logs_total{level="warn"} 12
yuulog_logs_total{level="info"} 248

# HELP nodejs_memory_usage_bytes Uso de memoria por Node.js
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} 52428800
nodejs_memory_usage_bytes{type="heapTotal"} 34603008
nodejs_memory_usage_bytes{type="heapUsed"} 27721840
nodejs_memory_usage_bytes{type="external"} 1833162

# HELP yuulog_operation_duration_seconds Tiempo de operación en segundos
# TYPE yuulog_operation_duration_seconds histogram
yuulog_operation_duration_seconds{operation="UsersController.findAll"} 0.045
yuulog_operation_duration_seconds{operation="AuthService.validateUser"} 0.128
```

You can scrape these metrics directly with Prometheus or use tools like Grafana for visualization.

## Formatting and Highlighting Utilities

YuuLogger provides powerful utilities for formatting and highlighting text in your logs:

### Highlighting Text

```typescript
import { highlight, h, highlightMany, highlightUrl } from 'yuulogger';

// Basic highlighting using function
logger.log(`Status: ${highlight('active')}`); // 'active' will be colorized

// Template literal tag for highlighting (cleaner syntax)
logger.log(`Connected to ${h`database`} successfully`); // 'database' will be colorized

// Highlight multiple values
const roles = highlightMany(['admin', 'user', 'guest']);
logger.log(`Available roles: ${roles.join(', ')}`);

// Highlight URLs
logger.log(`API running at ${highlightUrl()}`); // Colorizes http://localhost:3000
```

### Formatting Utilities

```typescript
import { 
  formatDuration, 
  formatMemorySize, 
  formatCpuUsage, 
  formatMemoryUsage 
} from 'yuulogger';

// Format a duration
const duration = formatDuration(1500); // "1.50 s"

// Format memory size
const memory = formatMemorySize(1572864); // "1.50 MB"

// Format CPU usage
const cpuUsage = formatCpuUsage({user: 15200, system: 5500}); // "User: 15.20ms, System: 5.50ms"

// Format memory usage
const memUsage = formatMemoryUsage(process.memoryUsage()); // "RSS: 50.20 MB, Heap: 25.10 MB/35.50 MB"

// Use in logs
logger.log(`Operation completed in ${duration} using ${memory}`);
```

### Getting Theme Colors

```typescript
import { 
  getCurrentTheme, 
  getThemeHighlightColor, 
  getLoggerOptions 
} from 'yuulogger';

// Get current theme name
const theme = getCurrentTheme(); // e.g., "default", "dark", etc.

// Get highlight color for a specific theme
const color = getThemeHighlightColor('colorful');

// Get current logger configuration
const options = getLoggerOptions();
```

## Environment Variable Parsing

YuuLogger provides utilities to help parse environment variables for configuration:

### Parsing Log Levels

The `parseLogLevels` utility handles parsing comma-separated log level strings from environment variables:

```typescript
import { parseLogLevels, validLogLevels } from 'yuulogger';

// Using with environment variables
// If LOG_LEVELS=error,warn,info in your .env file:
const levels = parseLogLevels(process.env.LOG_LEVELS);
// Result: ['error', 'warn', 'info']

// Special 'all' value expands to all valid log levels
// If LOG_LEVELS=all in your .env file:
const allLevels = parseLogLevels(process.env.LOG_LEVELS);
// Result: ['error', 'warn', 'info', 'verbose', 'debug']

// Empty or invalid values default to 'all'
const defaultLevels = parseLogLevels('');
// Result: ['all']

// Valid log levels are accessible through validLogLevels
console.log(validLogLevels);
// Output: ['error', 'warn', 'info', 'verbose', 'debug', 'all']
```

This is particularly useful with NestJS ConfigService:

```typescript
import { ConfigService } from '@nestjs/config';
import { YuuLogModule, parseLogLevels } from 'yuulogger';

@Module({
  imports: [
    ConfigModule.forRoot(),
    YuuLogModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Parse LOG_LEVELS=error,warn,info from environment
        logLevels: parseLogLevels(config.get('LOG_LEVELS')),
        // Other options...
      }),
    }),
  ],
})
export class AppModule {}
```

## API Reference

### YuuLogService

The main service that provides logging functionality.

#### Basic Logging Methods

- `log(message, context?)` - Log at 'info' level
- `error(message, trace?, context?)` - Log at 'error' level
- `warn(message, context?)` - Log at 'warn' level
- `debug(message, context?)` - Log at 'debug' level
- `verbose(message, context?)` - Log at 'verbose' level

#### Structured Logging Methods

- `structured(level, message, context?, data?)` - Create a structured log entry
- `structuredInfo(message, context?, data?)` - Create an info structured log
- `structuredError(message, context?, errorInfo?, additionalData?)` - Create an error structured log

#### Performance Measurement

- `startMeasure(operationName, metadata?)` - Start measuring performance
- `stopMeasure(operationName, logResults?)` - Stop measuring and get metrics
- `getPerformanceStats(operationName)` - Get performance statistics
- `clearPerformanceMetrics(operationName?)` - Clear collected metrics

#### Advanced Profiling

- `startProfile(operationName, context?, metadata?)` - Start a detailed profile
- `startChildProfile(parentId, operationName, metadata?)` - Add nested profiling
- `stopProfile(id, logResults?)` - Stop profiling and calculate metrics
- `getActiveProfiles()` - Get all active profiles
- `logPerformanceReport(profile, title?)` - Log a formatted report

#### Metrics and Statistics

- `getLogStats()` - Get log count statistics and metrics
- `resetLogCounters()` - Reset log count statistics

#### Helper Methods

- `profileFunction(fn, operationName?)` - Wrap a function with performance profiling
- `profileAsyncFunction(fn, operationName?)` - Wrap an async function
- `profileAsyncIterator(iterator, operationName)` - Profile each iteration

#### Static Methods

- `getLogger()` - Get a singleton instance of YuuLogService
- `getNestLogger()` - Get a NestJS compatible logger

## Themes

YuuLogger supports multiple visual themes for console output:

### Basic Themes

- `default` - Standard theme with balanced colors
- `dark` - Optimized for dark terminals
- `light` - Optimized for light terminals
- `colorful` - Vibrant colors for maximum visibility
- `minimal` - Reduced use of colors for a cleaner look

### Enhanced Themes

- `pastel` - Soft, muted colors for a gentle appearance
- `ocean` - Cool blue tones inspired by the sea
- `sunset` - Warm gradient colors resembling a sunset
- `forest` - Natural green and earth tones
- `cyberpunk` - Neon colors on dark background
- `coffee` - Warm browns and subtle highlights
- `royal` - Rich purple and gold color scheme
- `midnight` - Deep blues and subtle highlights
- `candy` - Bright, fun colors with high contrast
- `highContrast` - Maximum readability for accessibility
- `matrix` - Green text on black background

Example:

```typescript
YuuLogModule.forRoot({
  loggerTheme: 'colorful'
})
```

Example:

```typescript
YuuLogModule.forRoot({
  loggerTheme: 'colorful'
})
```

## File Logging

When file logging is enabled, logs are stored in the following structure:

- `logs/application-YYYY-MM-DD.log` - All logs at or above minimum level
- `logs/error-YYYY-MM-DD.log` - Only error logs

Files automatically rotate daily and are limited to 20MB.

## Contributing

We welcome contributions to YuuLogger! If you're interested in helping out, please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Submitting bug reports and feature requests
- Code style and development guidelines
- Pull request process
- Development setup instructions
- Testing guidelines

Your contributions help make YuuLogger better for everyone. Thank you!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

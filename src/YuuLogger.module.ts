import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import {
  YuuLogAsyncOptions,
  YuuLogOptions,
  YuuLogOptionsFactory,
} from "./interfaces/YuuLogger.interfaces";
import { YuuLogService } from "./services/YuuLogger.service";
import { LogFormatter } from "./utils/logger/Log.formatter";
import { LoggerUtilities } from "./utils/logger/Logger.utilities";
import { TransportManager } from "./utils/managers/Transport.manager";
import { PerformanceProfiler } from "./utils/performance/Performance.profiler";

/**
 * Constant for the injection token of options
 */
export const YUU_LOG_OPTIONS = "YUU_LOG_OPTIONS";

@Global()
@Module({
  providers: [
    YuuLogService,
    LogFormatter,
    TransportManager,
    LoggerUtilities,
    PerformanceProfiler,
  ],
  exports: [
    YuuLogService,
    LogFormatter,
    TransportManager,
    LoggerUtilities,
    PerformanceProfiler,
  ],
})
export class YuuLogModule {
  /**
   * Configure the module with static options
   *
   * @param options Configuration options
   * @returns Configured dynamic module
   *
   * @example
   * @Module({
   *   imports: [
   *     YuuLogModule.forRoot({
   *       appName: 'MyApp',
   *       logLevels: ['error', 'warn', 'info'],
   *       loggerTheme: 'colorful',
   *       enableFileLogging: true
   *     })
   *   ]
   * })
   * export class AppModule {}
   *
   */
  static forRoot(options: YuuLogOptions = {}): DynamicModule {
    return {
      module: YuuLogModule,
      providers: [
        {
          provide: YUU_LOG_OPTIONS,
          useValue: options,
        },
        LogFormatter,
        TransportManager,
        LoggerUtilities,
        PerformanceProfiler,
        YuuLogService,
      ],
      exports: [
        YuuLogService,
        LogFormatter,
        TransportManager,
        LoggerUtilities,
        PerformanceProfiler,
      ],
    };
  }

  /**
   * Configure the module with async options
   *
   * @param options Async configuration options
   * @returns Configured dynamic module
   *
   * @example
   * @Module({
   *   imports: [
   *     YuuLogModule.forRootAsync({
   *       imports: [ConfigModule],
   *       useFactory: (configService: ConfigService) => ({
   *         appName: configService.get('APP_NAME'),
   *         logLevels: configService.get('LOG_LEVELS'),
   *         loggerTheme: configService.get('LOGGER_THEME'),
   *         enableFileLogging: configService.get('ENABLE_FILE_LOGGING'),
   *       }),
   *       inject: [ConfigService],
   *     })
   *   ]
   * })
   * export class AppModule {}
   */
  static forRootAsync(options: YuuLogAsyncOptions): DynamicModule {
    return {
      module: YuuLogModule,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        LogFormatter,
        TransportManager,
        LoggerUtilities,
        PerformanceProfiler,
        YuuLogService,
      ],
      exports: [
        YuuLogService,
        LogFormatter,
        TransportManager,
        LoggerUtilities,
        PerformanceProfiler,
      ],
    };
  }

  /**
   * Creates the necessary providers for async configuration
   */
  private static createAsyncProviders(options: YuuLogAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (!options.useClass) {
      throw new Error(
        "options.useClass is undefined. Please provide a valid class.",
      );
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  /**
   * Creates the options provider for async configuration
   */
  private static createAsyncOptionsProvider(
    options: YuuLogAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: YUU_LOG_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const injectionToken = options.useExisting || options.useClass;
    if (!injectionToken) {
      throw new Error(
        "Either useExisting or useClass must be provided in the async options",
      );
    }

    return {
      provide: YUU_LOG_OPTIONS,
      useFactory: async (optionsFactory: YuuLogOptionsFactory) =>
        await optionsFactory.createYuuLogOptions(),
      inject: [injectionToken],
    };
  }
}

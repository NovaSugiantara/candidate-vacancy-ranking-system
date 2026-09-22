import { Global, Module } from '@nestjs/common';
import { ClockService } from '../shared/time/clock.service';
import { RequestContextService } from './correlation/request-context.service';
import { AppLoggerService } from './logging/app-logger.service';

/**
 * Cross-cutting singletons. Global on purpose: every module needs the logger and
 * the clock, and RequestContextService must be a SINGLE instance — it holds the
 * AsyncLocalStorage, so a second copy would carry a different store and silently
 * break request correlation.
 */
@Global()
@Module({
  providers: [RequestContextService, AppLoggerService, ClockService],
  exports: [RequestContextService, AppLoggerService, ClockService],
})
export class CommonModule {}

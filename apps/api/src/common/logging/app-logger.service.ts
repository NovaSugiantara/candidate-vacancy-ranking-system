import { Injectable, Logger } from '@nestjs/common';
import { RequestContextService } from '../correlation/request-context.service';

@Injectable()
export class AppLoggerService {
  private readonly logger = new Logger('Application');

  constructor(private readonly requestContext: RequestContextService) {}

  // ponytail: batch boundaries log outcomes; per-item loops stay silent.
  info(message: string): void {
    this.logger.log(this.withRequestId(message));
  }

  warn(message: string): void {
    this.logger.warn(this.withRequestId(message));
  }

  error(message: string, cause?: unknown): void {
    const trace = cause instanceof Error ? cause.stack : undefined;
    this.logger.error(this.withRequestId(message), trace);
  }

  private withRequestId(message: string): string {
    return `[requestId=${this.requestContext.getRequestId() ?? 'none'}] ${message}`;
  }
}

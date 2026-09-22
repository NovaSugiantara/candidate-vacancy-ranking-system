import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContext = {
  readonly requestId: string;
  cacheWarningLogged: boolean;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }

  run<T>(requestId: string, fn: () => T): T {
    return this.storage.run({ requestId, cacheWarningLogged: false }, fn);
  }

  claimCacheWarning(): boolean {
    const context = this.storage.getStore();
    if (context === undefined || context.cacheWarningLogged) {
      return context === undefined;
    }

    context.cacheWarningLogged = true;
    return true;
  }
}

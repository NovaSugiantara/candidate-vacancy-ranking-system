import {
  Inject,
  Injectable,
  type OnModuleDestroy,
} from '@nestjs/common';
import { createClient } from 'redis';
import {
  redisConfig,
  type RedisConfig,
} from '../../config/redis.config';
import { RequestContextService } from '../correlation/request-context.service';
import { AppLoggerService } from '../logging/app-logger.service';

export const REDIS_CONFIG = Symbol('REDIS_CONFIG');
export const redisConfigProvider = {
  provide: REDIS_CONFIG,
  useFactory: redisConfig,
};

type RedisClient = ReturnType<typeof createClient>;

const VACANCY_INDEX_KEY = 'ranking:v1:vacancy-index';
const RESULTS_SUFFIX = ':results';
const CRITERIA_SUFFIX = ':criteria';

function vacancyKey(vacancyId: string, suffix: string): string {
  return `ranking:v1:vacancy:${vacancyId}${suffix}`;
}

function vacancyIdFromKey(key: string): string | null {
  const match = /^ranking:v1:vacancy:([^:]+):(results|criteria)$/.exec(key);
  return match?.[1] ?? null;
}

@Injectable()
export class RedisClientProvider implements OnModuleDestroy {
  readonly client: RedisClient;

  constructor(@Inject(REDIS_CONFIG) config: RedisConfig) {
    this.client = createClient({
      socket: { host: config.host, port: config.port },
      disableOfflineQueue: true,
    });
    this.client.on('error', () => undefined);
  }

  connectLazily(): void {
    if (!this.client.isOpen) {
      void this.client.connect().catch(() => undefined);
    }
  }

  onModuleDestroy(): void {
    if (this.client.isOpen) {
      this.client.destroy();
    }
  }
}

@Injectable()
export class RankingCacheService {
  constructor(
    private readonly redis: RedisClientProvider,
    private readonly logger: AppLoggerService,
    private readonly requestContext: RequestContextService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    return this.fallback(async () => {
      const value = await this.redis.client.get(key);
      return value === null ? null : (JSON.parse(value) as T);
    }, null);
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.fallback(async () => {
      const vacancyId = vacancyIdFromKey(key);
      if (vacancyId === null) {
        await this.redis.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
        return;
      }

      await this.redis.client
        .multi()
        .set(key, JSON.stringify(value), { EX: ttlSeconds })
        .sAdd(VACANCY_INDEX_KEY, vacancyId)
        .execAsPipeline();
    }, undefined);
  }

  async del(key: string): Promise<void> {
    await this.fallback(async () => {
      await this.redis.client.del(key);
    }, undefined);
  }

  async invalidateAllRankings(): Promise<void> {
    await this.fallback(async () => {
      const vacancyIds = await this.redis.client.sMembers(VACANCY_INDEX_KEY);
      const pipeline = this.redis.client.multi();

      for (const vacancyId of vacancyIds) {
        pipeline.del([
          vacancyKey(vacancyId, RESULTS_SUFFIX),
          vacancyKey(vacancyId, CRITERIA_SUFFIX),
        ]);
      }

      pipeline.del(VACANCY_INDEX_KEY);
      await pipeline.execAsPipeline();
    }, undefined);
  }

  async invalidateVacancy(vacancyId: string): Promise<void> {
    await this.fallback(async () => {
      await this.redis.client
        .multi()
        .del([
          vacancyKey(vacancyId, RESULTS_SUFFIX),
          vacancyKey(vacancyId, CRITERIA_SUFFIX),
        ])
        .sRem(VACANCY_INDEX_KEY, vacancyId)
        .execAsPipeline();
    }, undefined);
  }

  private async fallback<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    this.redis.connectLazily();
    try {
      return await operation();
    } catch {
      if (this.requestContext.claimCacheWarning()) {
        this.logger.warn('cache.redis.fallback');
      }
      return fallback;
    }
  }
}

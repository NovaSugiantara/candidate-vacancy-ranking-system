import { Global, Module } from '@nestjs/common';
import {
  RankingCacheService,
  RedisClientProvider,
  redisConfigProvider,
} from './ranking-cache.service';

@Global()
@Module({
  providers: [redisConfigProvider, RedisClientProvider, RankingCacheService],
  exports: [RankingCacheService],
})
export class CacheModule {}

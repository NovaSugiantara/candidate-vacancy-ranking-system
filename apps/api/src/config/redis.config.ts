export interface RedisConfig {
  readonly host: string;
  readonly port: number;
  readonly rankingTtlSeconds: number;
  readonly criteriaTtlSeconds: number;
}

export function redisConfig(): RedisConfig {
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
    rankingTtlSeconds: Number.parseInt(process.env.REDIS_RANKING_TTL_SECONDS ?? '60', 10),
    criteriaTtlSeconds: Number.parseInt(process.env.REDIS_CRITERIA_TTL_SECONDS ?? '300', 10),
  };
}

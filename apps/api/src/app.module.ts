import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidatesModule } from './candidates/candidates.module';
import { CacheModule } from './common/cache/cache.module';
import { CorrelationIdInterceptor } from './common/correlation/correlation-id.interceptor';
import { RequestContextService } from './common/correlation/request-context.service';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { AppLoggerService } from './common/logging/app-logger.service';
import { databaseConfig } from './config/database.config';
import { RankingModule } from './ranking/ranking.module';
import { ClockService } from './shared/time/clock.service';
import { VacanciesModule } from './vacancies/vacancies.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...databaseConfig(),
        autoLoadEntities: true,
        retryAttempts: 5,
        retryDelay: 3_000,
      }),
    }),
    CacheModule,
    CandidatesModule,
    VacanciesModule,
    RankingModule,
  ],
  providers: [
    ClockService,
    RequestContextService,
    AppLoggerService,
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
  ],
})
export class AppModule {}

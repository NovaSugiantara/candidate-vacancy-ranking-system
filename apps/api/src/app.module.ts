import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidatesModule } from './candidates/candidates.module';
import { CacheModule } from './common/cache/cache.module';
import { CommonModule } from './common/common.module';
import { CorrelationIdInterceptor } from './common/correlation/correlation-id.interceptor';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { databaseConfig } from './config/database.config';
import { RankingModule } from './ranking/ranking.module';
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
    CommonModule,
    CacheModule,
    CandidatesModule,
    VacanciesModule,
    RankingModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
  ],
})
export class AppModule {}

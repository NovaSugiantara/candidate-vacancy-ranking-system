import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from '../candidates/entities/candidate.entity';
import { Vacancy } from '../vacancies/entities/vacancy.entity';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { AgeCriterionStrategy } from './strategies/age-criterion.strategy';
import { CriterionStrategyRegistry } from './strategies/criterion-strategy.registry';
import { GenderCriterionStrategy } from './strategies/gender-criterion.strategy';
import { SalaryRangeCriterionStrategy } from './strategies/salary-range-criterion.strategy';

// ClockService, RequestContextService and AppLoggerService come from the global
// CommonModule. Re-declaring them here would shadow that and hand this module a
// second AsyncLocalStorage, which silently drops the request id from ranking logs.
@Module({
  imports: [TypeOrmModule.forFeature([Candidate, Vacancy])],
  controllers: [RankingController],
  providers: [
    AgeCriterionStrategy,
    GenderCriterionStrategy,
    SalaryRangeCriterionStrategy,
    CriterionStrategyRegistry,
    RankingService,
  ],
  exports: [CriterionStrategyRegistry],
})
export class RankingModule {}

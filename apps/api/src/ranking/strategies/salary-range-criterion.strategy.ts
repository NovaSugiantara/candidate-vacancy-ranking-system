import { Injectable } from '@nestjs/common';
import type { Candidate } from '../../candidates/entities/candidate.entity';
import { CriterionType } from '../../shared/enums/criterion-type.enum';
import type { VacancyCriterion } from '../../vacancies/entities/vacancy-criterion.entity';
import type { CriterionStrategy } from './criterion-strategy.interface';

@Injectable()
export class SalaryRangeCriterionStrategy implements CriterionStrategy {
  readonly type = CriterionType.SALARY_RANGE;

  isMatch(candidate: Candidate, criterion: VacancyCriterion, _asOf: Date): boolean {
    const { minSalary, maxSalary } = criterion;
    if (minSalary === null || maxSalary === null) {
      return false;
    }
    return candidate.currentSalary >= minSalary && candidate.currentSalary <= maxSalary;
  }
}

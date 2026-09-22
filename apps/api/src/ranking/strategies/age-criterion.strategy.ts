import { Injectable } from '@nestjs/common';
import type { Candidate } from '../../candidates/entities/candidate.entity';
import { CriterionType } from '../../shared/enums/criterion-type.enum';
import type { VacancyCriterion } from '../../vacancies/entities/vacancy-criterion.entity';
import type { CriterionStrategy } from './criterion-strategy.interface';

type YearMonthDay = { year: number; month: number; day: number };

function yearMonthDay(value: string | Date): YearMonthDay {
  if (value instanceof Date) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  return { year, month, day };
}

// Completed years as of `asOf`: a birthday that has not yet occurred this year counts one less.
function completedYears(birthdate: string, asOf: Date): number {
  const birth = yearMonthDay(birthdate);
  const today = yearMonthDay(asOf);
  const beforeBirthday =
    today.month < birth.month || (today.month === birth.month && today.day < birth.day);
  return today.year - birth.year - (beforeBirthday ? 1 : 0);
}

@Injectable()
export class AgeCriterionStrategy implements CriterionStrategy {
  readonly type = CriterionType.AGE;

  isMatch(candidate: Candidate, criterion: VacancyCriterion, asOf: Date): boolean {
    const { minAge, maxAge } = criterion;
    if (minAge === null || maxAge === null) {
      return false;
    }
    const age = completedYears(candidate.birthdate, asOf);
    return age >= minAge && age <= maxAge;
  }
}

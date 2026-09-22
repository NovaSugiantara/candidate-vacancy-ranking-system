import { Injectable } from '@nestjs/common';
import { CriterionType } from '../../shared/enums/criterion-type.enum';
import { AgeCriterionStrategy } from './age-criterion.strategy';
import type { CriterionStrategy } from './criterion-strategy.interface';
import { GenderCriterionStrategy } from './gender-criterion.strategy';
import { SalaryRangeCriterionStrategy } from './salary-range-criterion.strategy';

@Injectable()
export class CriterionStrategyRegistry {
  private readonly strategies = new Map<CriterionType, CriterionStrategy>();

  constructor(
    age: AgeCriterionStrategy,
    gender: GenderCriterionStrategy,
    salary: SalaryRangeCriterionStrategy,
  ) {
    this.strategies.set(age.type, age);
    this.strategies.set(gender.type, gender);
    this.strategies.set(salary.type, salary);

    for (const type of Object.values(CriterionType)) {
      if (!this.strategies.has(type)) {
        throw new Error(`No criterion strategy registered for type ${type}`);
      }
    }
  }

  get(type: CriterionType): CriterionStrategy {
    const strategy = this.strategies.get(type);
    if (strategy === undefined) {
      throw new Error(`No criterion strategy registered for type ${type}`);
    }
    return strategy;
  }
}

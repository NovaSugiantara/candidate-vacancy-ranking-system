import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { CriterionGender } from '../../shared/enums/criterion-gender.enum';
import { CriterionType } from '../../shared/enums/criterion-type.enum';

@ValidatorConstraint({ name: 'minAgeNotGreaterThanMaxAge', async: false })
export class MinAgeNotGreaterThanMaxAgeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const { minAge, maxAge } = args.object as {
      minAge?: number;
      maxAge?: number;
    };
    if (typeof minAge !== 'number' || typeof maxAge !== 'number') {
      return true;
    }
    return minAge <= maxAge;
  }

  defaultMessage(): string {
    return 'minAge must be less than or equal to maxAge';
  }
}

@ValidatorConstraint({ name: 'minSalaryNotGreaterThanMaxSalary', async: false })
export class MinSalaryNotGreaterThanMaxSalaryConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const { minSalary, maxSalary } = args.object as {
      minSalary?: number;
      maxSalary?: number;
    };
    if (typeof minSalary !== 'number' || typeof maxSalary !== 'number') {
      return true;
    }
    return minSalary <= maxSalary;
  }

  defaultMessage(): string {
    return 'minSalary must be less than or equal to maxSalary';
  }
}

export class VacancyCriterionDto {
  @IsEnum(CriterionType)
  type: CriterionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  weight?: number;
}

export class AgeCriterionDto extends VacancyCriterionDto {
  @IsInt()
  @Min(0)
  @Max(130)
  minAge: number;

  @IsInt()
  @Min(0)
  @Max(130)
  @Validate(MinAgeNotGreaterThanMaxAgeConstraint)
  maxAge: number;
}

export class GenderCriterionDto extends VacancyCriterionDto {
  @IsEnum(CriterionGender)
  gender: CriterionGender;
}

export class SalaryRangeCriterionDto extends VacancyCriterionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minSalary: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Validate(MinSalaryNotGreaterThanMaxSalaryConstraint)
  maxSalary: number;
}

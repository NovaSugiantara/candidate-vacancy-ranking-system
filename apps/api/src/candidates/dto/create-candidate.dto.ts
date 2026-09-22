import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { CandidateGender } from '../../shared/enums/candidate-gender.enum';

@ValidatorConstraint({ name: 'isNotFutureDate', async: false })
export class IsNotFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return true;
    }
    const time = Date.parse(value);
    return Number.isNaN(time) || time <= Date.now();
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must not be in the future`;
  }
}

export class CreateCandidateDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email must be valid' })
  @MaxLength(254)
  email: string;

  @IsISO8601()
  @IsDateString()
  @Validate(IsNotFutureDateConstraint)
  birthdate: string;

  @IsEnum(CandidateGender)
  gender: CandidateGender;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentSalary: number;
}

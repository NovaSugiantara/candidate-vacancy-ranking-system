import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import { CandidateGender } from '../../shared/enums/candidate-gender.enum';
import { IsNotFutureDateConstraint } from './create-candidate.dto';

export class UpdateCandidateDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsISO8601()
  @IsDateString()
  @Validate(IsNotFutureDateConstraint)
  birthdate?: string;

  @IsOptional()
  @IsEnum(CandidateGender)
  gender?: CandidateGender;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentSalary?: number;
}

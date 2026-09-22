import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  AgeCriterionDto,
  GenderCriterionDto,
  SalaryRangeCriterionDto,
  VacancyCriterionDto,
} from './vacancy-criterion.dto';

export class UpdateVacancyDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VacancyCriterionDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'type',
      subTypes: [
        { name: 'AGE', value: AgeCriterionDto },
        { name: 'GENDER', value: GenderCriterionDto },
        { name: 'SALARY_RANGE', value: SalaryRangeCriterionDto },
      ],
    },
  })
  criteria?: VacancyCriterionDto[];
}

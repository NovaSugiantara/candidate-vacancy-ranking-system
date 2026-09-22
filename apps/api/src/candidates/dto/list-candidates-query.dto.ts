import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListCandidatesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsIn(['name', 'email', 'currentSalary', 'birthdate', 'createdAt'])
  sortBy: string = 'createdAt';

  @IsIn(['asc', 'desc'])
  sortOrder: string = 'desc';
}

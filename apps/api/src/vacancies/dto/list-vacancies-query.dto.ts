import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListVacanciesQueryDto {
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
  @MaxLength(160)
  search?: string;

  @IsIn(['name', 'createdAt'])
  sortBy: string = 'createdAt';

  @IsIn(['asc', 'desc'])
  sortOrder: string = 'desc';
}

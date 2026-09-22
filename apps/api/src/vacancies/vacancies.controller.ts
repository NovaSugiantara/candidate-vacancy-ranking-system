import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { ListVacanciesQueryDto } from './dto/list-vacancies-query.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import {
  VacanciesService,
  type VacancyListResponse,
  type VacancyResponse,
} from './vacancies.service';

@Controller('vacancies')
export class VacanciesController {
  constructor(private readonly vacanciesService: VacanciesService) {}

  @Post()
  create(@Body() dto: CreateVacancyDto): Promise<VacancyResponse> {
    return this.vacanciesService.create(dto);
  }

  @Get()
  list(@Query() query: ListVacanciesQueryDto): Promise<VacancyListResponse> {
    return this.vacanciesService.list(query);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<VacancyResponse> {
    return this.vacanciesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateVacancyDto,
  ): Promise<VacancyResponse> {
    return this.vacanciesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.vacanciesService.remove(id);
  }
}

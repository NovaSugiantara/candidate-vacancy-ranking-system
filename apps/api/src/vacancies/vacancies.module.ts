import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vacancy } from './entities/vacancy.entity';
import { VacancyCriterion } from './entities/vacancy-criterion.entity';
import { VacanciesController } from './vacancies.controller';
import { VacanciesService } from './vacancies.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vacancy, VacancyCriterion])],
  controllers: [VacanciesController],
  providers: [VacanciesService],
})
export class VacanciesModule {}

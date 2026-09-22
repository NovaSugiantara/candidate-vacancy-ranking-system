import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import type { EntityManager, FindOptionsOrder } from 'typeorm';
import { RankingCacheService } from '../common/cache/ranking-cache.service';
import { CriterionGender } from '../shared/enums/criterion-gender.enum';
import { CriterionType } from '../shared/enums/criterion-type.enum';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { ListVacanciesQueryDto } from './dto/list-vacancies-query.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import {
  AgeCriterionDto,
  GenderCriterionDto,
  SalaryRangeCriterionDto,
} from './dto/vacancy-criterion.dto';
import type { VacancyCriterionDto } from './dto/vacancy-criterion.dto';
import { VacancyCriterion } from './entities/vacancy-criterion.entity';
import { Vacancy } from './entities/vacancy.entity';

// sortBy is @IsIn-whitelisted; map it to the real property name, never interpolate input.
const SORT_FIELDS: Record<string, string> = {
  name: 'name',
  createdAt: 'createdAt',
};

export type VacancyCriterionResponse = {
  readonly id: string;
  readonly type: CriterionType;
  readonly weight: number;
  readonly minAge: number | null;
  readonly maxAge: number | null;
  readonly gender: CriterionGender | null;
  readonly minSalary: number | null;
  readonly maxSalary: number | null;
};

export type VacancyResponse = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly criteria: readonly VacancyCriterionResponse[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type VacancyListResponse = {
  readonly data: readonly VacancyResponse[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
};

@Injectable()
export class VacanciesService {
  private readonly logger = new Logger(VacanciesService.name);

  constructor(
    @InjectRepository(Vacancy)
    private readonly repository: Repository<Vacancy>,
    private readonly dataSource: DataSource,
    private readonly rankingCache: RankingCacheService,
  ) {}

  async create(dto: CreateVacancyDto): Promise<VacancyResponse> {
    const vacancy = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(
        manager.create(Vacancy, {
          name: dto.name,
          description: dto.description,
        }),
      );
      await manager.save(this.toCriterionEntities(dto.criteria, saved.id, manager));
      return this.loadById(manager, saved.id);
    });
    await this.rankingCache.invalidateVacancy(vacancy.id);
    this.logger.log(
      `vacancy.created id=${vacancy.id} criteria=${vacancy.criteria.length}`,
    );
    return this.toResponse(vacancy);
  }

  async list(query: ListVacanciesQueryDto): Promise<VacancyListResponse> {
    const { page, limit, search, sortBy, sortOrder } = query;
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const order: FindOptionsOrder<Vacancy> =
      SORT_FIELDS[sortBy] === 'name'
        ? { name: direction }
        : { createdAt: direction };

    const [rows, total] = await this.repository.findAndCount({
      where: search ? { name: ILike(`%${search}%`) } : {},
      relations: { criteria: true },
      relationLoadStrategy: 'query',
      order,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: rows.map((vacancy) => this.toResponse(vacancy)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<VacancyResponse> {
    return this.toResponse(await this.getOne(id));
  }

  async update(id: string, dto: UpdateVacancyDto): Promise<VacancyResponse> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: [
          { field: 'body', message: 'At least one field must be provided' },
        ],
      });
    }

    await this.getOne(id);

    const vacancy = await this.dataSource.transaction(async (manager) => {
      if (dto.name !== undefined) {
        await manager.update(Vacancy, id, { name: dto.name });
      }
      if (dto.description !== undefined) {
        await manager.update(Vacancy, id, { description: dto.description });
      }
      if (dto.criteria !== undefined) {
        await manager.delete(VacancyCriterion, { vacancyId: id });
        await manager.save(this.toCriterionEntities(dto.criteria, id, manager));
      }
      return this.loadById(manager, id);
    });

    await this.rankingCache.invalidateVacancy(id);
    this.logger.log(
      `vacancy.updated id=${id} criteria=${vacancy.criteria.length}`,
    );
    return this.toResponse(vacancy);
  }

  async remove(id: string): Promise<void> {
    await this.getOne(id);
    await this.repository.delete(id);
    await this.rankingCache.invalidateVacancy(id);
    this.logger.log(`vacancy.deleted id=${id}`);
  }

  private async getOne(id: string): Promise<Vacancy> {
    const vacancy = await this.repository.findOne({
      where: { id },
      relations: { criteria: true },
    });
    if (vacancy === null) {
      throw new NotFoundException();
    }
    return vacancy;
  }

  private async loadById(manager: EntityManager, id: string): Promise<Vacancy> {
    return manager.findOneOrFail(Vacancy, {
      where: { id },
      relations: { criteria: true },
    });
  }

  private toCriterionEntities(
    dtos: VacancyCriterionDto[],
    vacancyId: string,
    manager: EntityManager,
  ): VacancyCriterion[] {
    return dtos.map((criterion) =>
      this.toCriterionEntity(criterion, vacancyId, manager),
    );
  }

  private toCriterionEntity(
    criterion: VacancyCriterionDto,
    vacancyId: string,
    manager: EntityManager,
  ): VacancyCriterion {
    const base = {
      vacancyId,
      type: criterion.type,
      weight: criterion.weight ?? 1,
      minAge: null,
      maxAge: null,
      gender: null,
      minSalary: null,
      maxSalary: null,
    };

    if (criterion instanceof AgeCriterionDto) {
      return manager.create(VacancyCriterion, {
        ...base,
        minAge: criterion.minAge,
        maxAge: criterion.maxAge,
      });
    }
    if (criterion instanceof GenderCriterionDto) {
      return manager.create(VacancyCriterion, {
        ...base,
        gender: criterion.gender,
      });
    }
    const salary = criterion as SalaryRangeCriterionDto;
    return manager.create(VacancyCriterion, {
      ...base,
      minSalary: salary.minSalary,
      maxSalary: salary.maxSalary,
    });
  }

  private toResponse(vacancy: Vacancy): VacancyResponse {
    return {
      id: vacancy.id,
      name: vacancy.name,
      description: vacancy.description,
      criteria: vacancy.criteria.map((criterion) => ({
        id: criterion.id,
        type: criterion.type,
        weight: criterion.weight,
        minAge: criterion.minAge ?? null,
        maxAge: criterion.maxAge ?? null,
        gender: criterion.gender ?? null,
        minSalary: criterion.minSalary ?? null,
        maxSalary: criterion.maxSalary ?? null,
      })),
      createdAt: vacancy.createdAt,
      updatedAt: vacancy.updatedAt,
    };
  }
}

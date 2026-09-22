import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RankingCacheService } from '../common/cache/ranking-cache.service';
import { CandidateGender } from '../shared/enums/candidate-gender.enum';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { ListCandidatesQueryDto } from './dto/list-candidates-query.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { Candidate } from './entities/candidate.entity';

// sortBy is @IsIn-whitelisted; map it to the real column name, never interpolate user input.
const SORT_COLUMNS: Record<string, string> = {
  name: 'candidate.name',
  email: 'candidate.email',
  currentSalary: 'candidate.current_salary',
  birthdate: 'candidate.birthdate',
  createdAt: 'candidate.created_at',
};

export type CandidateResponse = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly birthdate: string;
  readonly gender: CandidateGender;
  readonly currentSalary: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CandidateListResponse = {
  readonly data: readonly CandidateResponse[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
};

// pg returns `date` columns as a local-midnight Date; the entity types it as string.
function formatBirthdate(value: unknown): string {
  if (!(value instanceof Date)) {
    return String(value);
  }
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly repository: Repository<Candidate>,
    private readonly rankingCache: RankingCacheService,
  ) {}

  async create(dto: CreateCandidateDto): Promise<CandidateResponse> {
    const candidate = await this.repository.save(
      this.repository.create({
        name: dto.name,
        email: dto.email,
        birthdate: dto.birthdate,
        gender: dto.gender,
        currentSalary: dto.currentSalary,
      }),
    );
    await this.rankingCache.invalidateAllRankings();
    this.logger.log(`candidate.created id=${candidate.id}`);
    return this.toResponse(candidate);
  }

  async list(query: ListCandidatesQueryDto): Promise<CandidateListResponse> {
    const { page, limit, search, sortBy, sortOrder } = query;
    const qb = this.repository.createQueryBuilder('candidate');

    if (search) {
      qb.where('candidate.name ILIKE :search OR candidate.email ILIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy(SORT_COLUMNS[sortBy], sortOrder === 'asc' ? 'ASC' : 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((candidate) => this.toResponse(candidate)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CandidateResponse> {
    return this.toResponse(await this.getActive(id));
  }

  async update(id: string, dto: UpdateCandidateDto): Promise<CandidateResponse> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: [
          { field: 'body', message: 'At least one field must be provided' },
        ],
      });
    }

    const candidate = await this.getActive(id);
    this.repository.merge(candidate, dto);
    const saved = await this.repository.save(candidate);
    await this.rankingCache.invalidateAllRankings();
    this.logger.log(`candidate.updated id=${saved.id}`);
    return this.toResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const candidate = await this.getActive(id);
    await this.repository.softDelete(candidate.id);
    await this.rankingCache.invalidateAllRankings();
    this.logger.log(`candidate.deleted id=${candidate.id}`);
  }

  private async getActive(id: string): Promise<Candidate> {
    const candidate = await this.repository.findOneBy({ id });
    if (candidate === null) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }

  private toResponse(candidate: Candidate): CandidateResponse {
    return {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      birthdate: formatBirthdate(candidate.birthdate),
      gender: candidate.gender,
      currentSalary: candidate.currentSalary,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };
  }
}

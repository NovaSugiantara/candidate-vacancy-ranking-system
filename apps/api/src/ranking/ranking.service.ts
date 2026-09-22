import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Candidate } from '../candidates/entities/candidate.entity';
import { RankingCacheService } from '../common/cache/ranking-cache.service';
import { AppLoggerService } from '../common/logging/app-logger.service';
import { CriterionType } from '../shared/enums/criterion-type.enum';
import { ClockService } from '../shared/time/clock.service';
import { Vacancy } from '../vacancies/entities/vacancy.entity';
import type { RankingQueryDto } from './dto/ranking-query.dto';
import type { CachedRanking, RankingResponse, RankingResultItem } from './ranking.types';
import { CriterionStrategyRegistry } from './strategies/criterion-strategy.registry';

const CACHE_KEY_PREFIX = 'ranking:v1:vacancy:';
const CACHE_KEY_SUFFIX = ':results';

const RANKING_TTL_SECONDS = Number.parseInt(process.env.REDIS_RANKING_TTL_SECONDS ?? '60', 10);

const CRITERION_TYPE_ORDER = Object.values(CriterionType);

function compareStrings(a: string, b: string): number {
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  if (lowerA < lowerB) {
    return -1;
  }
  if (lowerA > lowerB) {
    return 1;
  }
  return 0;
}

function compareById(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

function compareRankingItems(a: RankingResultItem, b: RankingResultItem): number {
  const byScore = b.score - a.score;
  if (byScore !== 0) {
    return byScore;
  }
  const byName = compareStrings(a.name, b.name);
  if (byName !== 0) {
    return byName;
  }
  return compareById(a.candidateId, b.candidateId);
}

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(Vacancy)
    private readonly vacancyRepository: Repository<Vacancy>,
    private readonly registry: CriterionStrategyRegistry,
    private readonly rankingCache: RankingCacheService,
    private readonly clock: ClockService,
    private readonly logger: AppLoggerService,
  ) {}

  async rank(vacancyId: string, query: RankingQueryDto): Promise<RankingResponse> {
    const cacheKey = `${CACHE_KEY_PREFIX}${vacancyId}${CACHE_KEY_SUFFIX}`;
    const cached = await this.rankingCache.get<CachedRanking>(cacheKey);
    if (cached !== null) {
      this.logger.info('ranking.cache.hit');
      return this.paginate(cached, query);
    }

    const vacancy = await this.vacancyRepository.findOne({
      where: { id: vacancyId },
      relations: { criteria: true },
    });
    if (vacancy === null) {
      throw new NotFoundException('Vacancy not found');
    }

    const candidates = await this.candidateRepository.find();

    const startedAt = Date.now();
    const scored = this.score(vacancy, candidates);
    const durationMs = Date.now() - startedAt;

    this.logger.info(
      `ranking.computed vacancyId=${vacancyId} candidates=${candidates.length} durationMs=${durationMs}`,
    );

    const payload: CachedRanking = {
      vacancy: { id: vacancy.id, name: vacancy.name },
      results: scored,
    };
    await this.rankingCache.set(cacheKey, payload, RANKING_TTL_SECONDS);

    return this.paginate(payload, query);
  }

  private score(vacancy: Vacancy, candidates: Candidate[]): RankingResultItem[] {
    const asOf = this.clock.now();
    const criteria = [...(vacancy.criteria ?? [])].sort(
      (a, b) => CRITERION_TYPE_ORDER.indexOf(a.type) - CRITERION_TYPE_ORDER.indexOf(b.type),
    );

    return candidates
      .map((candidate) => {
        let score = 0;
        const matchedCriteria = criteria.map((criterion) => {
          const strategy = this.registry.get(criterion.type);
          const matched = strategy.isMatch(candidate, criterion, asOf);
          if (matched) {
            score += criterion.weight;
          }
          return { type: criterion.type, weight: criterion.weight, matched };
        });

        return {
          candidateId: candidate.id,
          name: candidate.name,
          email: candidate.email,
          score,
          matchedCriteria,
        };
      })
      .sort(compareRankingItems);
  }

  private paginate(payload: CachedRanking, query: RankingQueryDto): RankingResponse {
    const { page, limit, search } = query;
    const minScore = query.minScore ?? 0;

    let results = payload.results;
    if (search) {
      const needle = search.toLowerCase();
      results = results.filter(
        (item) =>
          item.name.toLowerCase().includes(needle) || item.email.toLowerCase().includes(needle),
      );
    }

    results = results.filter((item) => item.score >= minScore);

    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const slice = results.slice(start, start + limit);

    return {
      vacancy: payload.vacancy,
      results: slice,
      pagination: { page, limit, total, totalPages },
    };
  }
}

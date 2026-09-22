import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RankingQueryDto } from './dto/ranking-query.dto';
import { RankingService } from './ranking.service';
import type { RankingResponse } from './ranking.types';

@Controller('vacancies')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get(':vacancyId/ranking')
  rank(
    @Param('vacancyId', new ParseUUIDPipe()) vacancyId: string,
    @Query() query: RankingQueryDto,
  ): Promise<RankingResponse> {
    return this.rankingService.rank(vacancyId, query);
  }
}

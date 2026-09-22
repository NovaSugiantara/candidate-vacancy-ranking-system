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
import {
  CandidatesService,
  type CandidateListResponse,
  type CandidateResponse,
} from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { ListCandidatesQueryDto } from './dto/list-candidates-query.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  create(@Body() dto: CreateCandidateDto): Promise<CandidateResponse> {
    return this.candidatesService.create(dto);
  }

  @Get()
  list(@Query() query: ListCandidatesQueryDto): Promise<CandidateListResponse> {
    return this.candidatesService.list(query);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CandidateResponse> {
    return this.candidatesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCandidateDto,
  ): Promise<CandidateResponse> {
    return this.candidatesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.candidatesService.remove(id);
  }
}

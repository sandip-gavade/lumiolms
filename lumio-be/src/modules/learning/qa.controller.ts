import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getTenantId } from '../../common/tenant-context';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QaService } from './qa.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('learning')
@Controller()
export class QaController {
  constructor(private readonly qa: QaService) {}

  @Get('courses/:id/questions')
  list(@Param('id') courseId: string) {
    return this.qa.listForCourse(getTenantId(), courseId);
  }

  @Post('courses/:id/questions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  ask(
    @Param('id') courseId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.qa.ask(getTenantId(), courseId, user, dto);
  }

  @Post('questions/:id/answers')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  answer(
    @Param('id') questionId: string,
    @Body() dto: CreateAnswerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.qa.answer(getTenantId(), questionId, user, dto);
  }
}

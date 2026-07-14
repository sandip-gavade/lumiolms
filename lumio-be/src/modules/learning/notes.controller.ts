import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getTenantId } from '../../common/tenant-context';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('learning')
@Controller()
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get('lectures/:id/notes')
  list(
    @Param('id') lectureId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notes.listForLecture(getTenantId(), user.userId, lectureId);
  }

  @Post('lectures/:id/notes')
  create(
    @Param('id') lectureId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notes.create(getTenantId(), user.userId, lectureId, dto);
  }

  @Patch('notes/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notes.update(getTenantId(), user.userId, id, dto);
  }

  @Delete('notes/:id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.notes.remove(getTenantId(), user.userId, id);
  }
}

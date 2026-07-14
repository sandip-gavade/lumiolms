import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevOnlyGuard } from './dev-only.guard';
import { DevService } from './dev.service';
import { QuickLoginDto } from './dto/quick-login.dto';

@ApiTags('dev')
@Controller('dev')
@UseGuards(DevOnlyGuard)
export class DevController {
  constructor(private readonly dev: DevService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[DEV ONLY] Get a token without the curl bootstrap dance',
    description:
      'Not present in production (NODE_ENV=production disables this whole module). Creates ' +
      '— or reuses — a stable "Dev Org" tenant and one user per role, then returns a normal ' +
      "session. Paste the accessToken into the Authorize button above and you're done; no " +
      'tenant header needed afterwards since it comes from the token.',
  })
  quickLogin(@Body() dto: QuickLoginDto) {
    return this.dev.quickLogin(dto.role);
  }
}

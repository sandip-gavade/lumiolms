import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // NFR-6.1: unauthenticated health check for the GCP load balancer / uptime checks.
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }
}

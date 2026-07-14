import { Module } from '@nestjs/common';
import { JobsModule } from '../../jobs/jobs.module';
import { EmailProcessor } from './email.processor';
import { EmailQueueService } from './email-queue.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [JobsModule], // supplies the registered 'email' BullMQ queue
  controllers: [NotificationsController],
  providers: [EmailQueueService, EmailProcessor, NotificationsService],
  exports: [EmailQueueService, NotificationsService],
})
export class NotificationsModule {}

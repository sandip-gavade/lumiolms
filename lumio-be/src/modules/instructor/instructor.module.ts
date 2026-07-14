import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';

@Module({
  imports: [NotificationsModule],
  controllers: [InstructorController],
  providers: [InstructorService],
})
export class InstructorModule {}

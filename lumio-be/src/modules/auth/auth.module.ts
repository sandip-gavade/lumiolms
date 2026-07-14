import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService], // TenancyService mints a session for a new org's first admin
})
export class AuthModule {}

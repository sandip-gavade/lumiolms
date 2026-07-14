import { Module } from '@nestjs/common';
import { OrgAdminController } from './org-admin.controller';
import { OrgAdminService } from './org-admin.service';

@Module({
  controllers: [OrgAdminController],
  providers: [OrgAdminService],
})
export class OrgAdminModule {}

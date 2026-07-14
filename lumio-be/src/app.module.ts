import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { DevModule } from './dev/dev.module';
import { JobsModule } from './jobs/jobs.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { InstructorModule } from './modules/instructor/instructor.module';
import { LearningModule } from './modules/learning/learning.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrgAdminModule } from './modules/org-admin/org-admin.module';
import { PlatformBillingModule } from './modules/platform-billing/platform-billing.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    JobsModule,
    TenancyModule,
    AuthModule,
    CatalogModule,
    CommerceModule,
    LearningModule,
    InstructorModule,
    OrgAdminModule,
    SuperAdminModule,
    PlatformBillingModule,
    NotificationsModule,
    // Not registered at all in production — DevOnlyGuard on the controller is the second,
    // redundant gate in case this module ever ends up imported somewhere unexpected.
    ...(process.env.NODE_ENV === 'production' ? [] : [DevModule]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .exclude({ path: 'health', method: RequestMethod.GET })
      .forRoutes('*');
  }
}

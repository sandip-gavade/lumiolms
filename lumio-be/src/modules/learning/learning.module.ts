import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { EnrollmentGuard } from './enrollment.util';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { QaController } from './qa.controller';
import { QaService } from './qa.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    ProgressController,
    DashboardController,
    NotesController,
    QaController,
    CertificatesController,
  ],
  providers: [
    ProgressService,
    DashboardService,
    NotesService,
    QaService,
    CertificatesService,
    EnrollmentGuard,
  ],
})
export class LearningModule {}

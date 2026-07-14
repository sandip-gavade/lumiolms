import { randomBytes } from 'node:crypto';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { StorageService } from '../../common/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../notifications/email-queue.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly emailQueue: EmailQueueService,
    private readonly notifications: NotificationsService,
  ) {}

  listMine(tenantId: string, userId: string) {
    return this.prisma.certificate.findMany({
      where: { tenantId, userId },
      orderBy: { issuedAt: 'desc' },
      include: { course: { select: { id: true, title: true, slug: true } } },
    });
  }

  async getMine(tenantId: string, userId: string, certificateId: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id: certificateId, tenantId, userId },
    });
    if (!certificate) throw new NotFoundException('Certificate not found.');
    return certificate;
  }

  /** Idempotent — called every time a lecture is marked complete; only actually issues once
   *  the course reaches 100%, and only once ever (unique on userId+courseId). */
  async issueIfComplete(
    tenantId: string,
    userId: string,
    courseId: string,
  ): Promise<void> {
    const alreadyIssued = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (alreadyIssued) return;

    const [totalLectures, completedLectures] = await Promise.all([
      this.prisma.lecture.count({ where: { section: { courseId } } }),
      this.prisma.lectureProgress.count({
        where: {
          userId,
          completedAt: { not: null },
          lecture: { section: { courseId } },
        },
      }),
    ]);
    if (totalLectures === 0 || completedLectures < totalLectures) return;

    const [user, course] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.course.findUniqueOrThrow({ where: { id: courseId } }),
    ]);

    const certificateNumber = `LMO-${course.id.slice(0, 8).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const pdfBuffer = await this.renderPdf(
      user.name,
      course.title,
      certificateNumber,
    );
    const pdfUrl = await this.storage.save('certificates', 'pdf', pdfBuffer);

    const certificate = await this.prisma.certificate.create({
      data: { tenantId, userId, courseId, certificateNumber, pdfUrl },
    });

    await Promise.all([
      this.notifications.create(tenantId, userId, 'CERTIFICATE_READY', {
        courseId,
        certificateId: certificate.id,
      }),
      this.emailQueue.enqueue({
        type: 'certificate-ready',
        to: user.email,
        name: user.name,
        courseTitle: course.title,
        certificateUrl: pdfUrl,
      }),
    ]);
    this.logger.log(
      `Issued certificate ${certificateNumber} to ${user.email} for "${course.title}".`,
    );
  }

  private renderPdf(
    studentName: string,
    courseTitle: string,
    certificateNumber: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 50,
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(12)
        .fillColor('#888')
        .text('CERTIFICATE OF COMPLETION', { align: 'center' })
        .moveDown(2)
        .fontSize(28)
        .fillColor('#111')
        .text(studentName, { align: 'center' })
        .moveDown(0.5)
        .fontSize(14)
        .fillColor('#333')
        .text('has successfully completed', { align: 'center' })
        .moveDown(0.5)
        .fontSize(20)
        .fillColor('#111')
        .text(courseTitle, { align: 'center' })
        .moveDown(2)
        .fontSize(10)
        .fillColor('#888')
        .text(`Certificate No. ${certificateNumber}`, { align: 'center' })
        .text(
          new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          { align: 'center' },
        );

      doc.end();
    });
  }
}

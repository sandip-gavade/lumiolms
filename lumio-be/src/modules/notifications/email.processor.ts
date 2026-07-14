import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TransactionalEmailJob } from './email-queue.service';

/**
 * TODO(sendgrid): replace the log line with an actual SendGrid API call once an API key
 * exists. Kept as a working stub — rather than unimplemented — so the signup/reset flows are
 * fully exercisable end-to-end in dev without external credentials; run this process
 * separately from the API per NFR-5.6 (`node dist/jobs/worker.js`, once that entrypoint
 * exists alongside main.ts).
 */
@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<TransactionalEmailJob>): Promise<void> {
    const { data } = job;
    switch (data.type) {
      case 'verify-email':
        this.logger.log(
          `[dev-stub] verification email to ${data.to}: ${data.verifyUrl}`,
        );
        return;
      case 'password-reset':
        this.logger.log(
          `[dev-stub] password reset email to ${data.to}: ${data.resetUrl}`,
        );
        return;
      case 'qa-reply':
        this.logger.log(
          `[dev-stub] Q&A reply email to ${data.to} re: "${data.courseTitle}" — ${data.courseUrl}`,
        );
        return;
      case 'certificate-ready':
        this.logger.log(
          `[dev-stub] certificate-ready email to ${data.to} for "${data.courseTitle}": ${data.certificateUrl}`,
        );
        return;
      case 'course-announcement':
        this.logger.log(
          `[dev-stub] announcement email to ${data.to} for "${data.courseTitle}": "${data.announcementTitle}" — ${data.courseUrl}`,
        );
        return;
    }
  }
}

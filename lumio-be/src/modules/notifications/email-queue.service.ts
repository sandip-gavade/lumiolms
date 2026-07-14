import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export type TransactionalEmailJob =
  | { type: 'verify-email'; to: string; name: string; verifyUrl: string }
  | { type: 'password-reset'; to: string; name: string; resetUrl: string }
  | {
      type: 'qa-reply';
      to: string;
      name: string;
      questionExcerpt: string;
      courseTitle: string;
      courseUrl: string;
    }
  | {
      type: 'certificate-ready';
      to: string;
      name: string;
      courseTitle: string;
      certificateUrl: string;
    }
  | {
      type: 'course-announcement';
      to: string;
      name: string;
      courseTitle: string;
      announcementTitle: string;
      courseUrl: string;
    };

/**
 * Thin producer: enqueues onto the 'email' BullMQ queue (registered in JobsModule) rather
 * than sending mail inline, so a slow/down SendGrid never blocks an auth request
 * (NFR-5.6). The actual delivery (SendGrid call, template rendering) is the worker's job —
 * see email.processor.ts, currently a logging stub pending SendGrid integration.
 */
@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue<TransactionalEmailJob>,
  ) {}

  async enqueue(job: TransactionalEmailJob): Promise<void> {
    await this.emailQueue.add(job.type, job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Registers the BullMQ connection and queues shared by src/jobs/processors (NFR-5.6: workers
 * run as a separate Cloud Run deployable from the API but import this same module, so queue
 * names/config stay in one place). Processors are added here as each is built —
 * email delivery, certificate PDF rendering, Mux webhook intake.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>('REDIS_URL') },
      }),
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'certificate-pdf' },
      { name: 'mux-webhook' },
    ),
  ],
  exports: [BullModule],
})
export class JobsModule {}

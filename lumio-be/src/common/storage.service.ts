import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * TODO(gcs): production storage is GCS (see docs/requirements.md), but wiring
 * @google-cloud/storage isn't testable in this environment without real credentials — rather
 * than add an unverified dependency, this only implements the local-disk path, structured so
 * a GcsStorageService can drop in behind the same `save()` signature later (swap the
 * provider in StorageModule, no callers change).
 *
 * Files land under `uploads/<prefix>/` and are served back out via Express static hosting
 * (see main.ts `useStaticAssets`) at `${APP_API_URL}/static/<prefix>/<filename>`.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root = join(process.cwd(), 'uploads');

  constructor(private readonly config: ConfigService) {}

  async save(prefix: string, extension: string, data: Buffer): Promise<string> {
    const dir = join(this.root, prefix);
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(join(dir, filename), data);
    const url = `${this.apiUrl()}/static/${prefix}/${filename}`;
    this.logger.log(
      `Saved ${prefix}/${filename} to local disk (dev storage — see TODO(gcs) above).`,
    );
    return url;
  }

  private apiUrl(): string {
    return (
      this.config.get<string>('API_URL') ??
      `http://localhost:${this.config.get<string>('PORT') ?? '3001'}`
    );
  }
}

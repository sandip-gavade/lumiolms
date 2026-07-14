import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { TokenService } from './token.service';

// Global: TokenService is needed by TenantContextMiddleware (applied in AppModule, outside
// any single feature module) and by AuthModule — simplest to provide it once, everywhere.
@Global()
@Module({
  providers: [TokenService, StorageService],
  exports: [TokenService, StorageService],
})
export class CommonModule {}

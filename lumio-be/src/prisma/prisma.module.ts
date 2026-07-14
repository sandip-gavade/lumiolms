import { Global, Module } from '@nestjs/common';
import { PrismaService, tenantPrismaProvider } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, tenantPrismaProvider],
  exports: [PrismaService, tenantPrismaProvider],
})
export class PrismaModule {}

import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from './slug.util';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tenant-defined categories plus platform defaults (tenantId null) — FR-6.3/FR-7.4. */
  async list(tenantId: string) {
    return this.prisma.category.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }] },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, name: string) {
    const slug = slugify(name);
    try {
      return await this.prisma.category.create({
        data: { tenantId, name, slug },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A category with this name already exists.',
        );
      }
      throw err;
    }
  }
}

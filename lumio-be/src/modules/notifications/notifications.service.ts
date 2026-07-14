import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tenantId: string,
    userId: string,
    type: NotificationType,
    payload: Prisma.InputJsonObject,
  ) {
    return this.prisma.notification.create({
      data: { tenantId, userId, type, payload },
    });
  }

  listMine(tenantId: string, userId: string) {
    return this.prisma.notification.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(tenantId: string, userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, tenantId, userId },
      data: { readAt: new Date() },
    });
  }
}

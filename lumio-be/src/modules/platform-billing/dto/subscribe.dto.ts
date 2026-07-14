import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanCode } from '@prisma/client';
import { IsEnum, IsInt, Min } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ enum: SubscriptionPlanCode })
  @IsEnum(SubscriptionPlanCode)
  planCode!: SubscriptionPlanCode;

  @IsInt()
  @Min(1)
  seats!: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanCode } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ enum: SubscriptionPlanCode })
  @IsEnum(SubscriptionPlanCode)
  code!: SubscriptionPlanCode;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @Min(0)
  priceCentsMo!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  seatLimit?: number;

  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;
}

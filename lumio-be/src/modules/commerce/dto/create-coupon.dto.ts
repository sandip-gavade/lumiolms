import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  /** Percent (1-100) if discountType is PERCENT, cents if FIXED. */
  @IsInt()
  @Min(1)
  discountValue!: number;

  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @Type(() => Date)
  @IsDate()
  endsAt!: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxRedemptions?: number;
}

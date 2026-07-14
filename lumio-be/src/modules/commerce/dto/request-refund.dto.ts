import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestRefundDto {
  /** Omit to request a refund for the whole order; include to refund a single course. */
  @IsOptional()
  @IsUUID()
  orderItemId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class QuickLoginDto {
  @ApiPropertyOptional({
    enum: MembershipRole,
    default: 'ORG_ADMIN',
    description:
      'Which role to get a token for — a stable dev user is reused per role.',
  })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;
}

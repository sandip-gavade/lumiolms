import { IsOptional, IsUUID } from 'class-validator';

export class ImpersonateDto {
  /** Which of the target's tenant memberships to impersonate into — required if they belong
   *  to more than one tenant, since there's no single unambiguous default. */
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

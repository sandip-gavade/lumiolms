import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'static',
  'docs',
  'mail',
]);

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  orgName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message:
      'Subdomain must be lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.',
  })
  subdomain!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(72)
  adminPassword!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  adminName!: string;

  static isReservedSubdomain(subdomain: string): boolean {
    return RESERVED_SUBDOMAINS.has(subdomain);
  }
}

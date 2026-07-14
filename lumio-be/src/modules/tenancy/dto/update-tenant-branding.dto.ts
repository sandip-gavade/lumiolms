import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateTenantBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'primaryColor must be a hex color, e.g. #4F46E5.',
  })
  primaryColor?: string;
}

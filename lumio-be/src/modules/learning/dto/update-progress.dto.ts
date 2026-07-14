import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsInt()
  @Min(0)
  positionSeconds!: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

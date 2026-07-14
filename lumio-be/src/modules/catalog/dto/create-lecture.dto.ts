import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLectureDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsInt()
  @Min(0)
  position!: number;

  @IsInt()
  @Min(1)
  durationSeconds!: number;

  @IsOptional()
  @IsString()
  videoAssetId?: string;

  @IsOptional()
  @IsString()
  transcriptUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}

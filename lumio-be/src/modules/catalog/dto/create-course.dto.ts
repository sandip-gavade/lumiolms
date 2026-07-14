import { CourseLevel } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(300)
  shortDesc!: string;

  @IsString()
  @MinLength(20)
  longDesc!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  outcomes?: string[];

  @ApiPropertyOptional({ enum: CourseLevel })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsInt()
  @Min(0)
  @Max(10_000_00) // $10,000.00 ceiling — sanity bound, not a real business rule
  priceCents!: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

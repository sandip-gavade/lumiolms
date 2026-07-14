import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsInt()
  @Min(0)
  position!: number;
}

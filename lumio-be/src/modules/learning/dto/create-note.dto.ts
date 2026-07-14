import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsInt()
  @Min(0)
  timestampSeconds!: number;

  @IsString()
  @MinLength(1)
  body!: string;
}

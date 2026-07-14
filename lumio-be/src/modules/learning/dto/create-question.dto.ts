import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateQuestionDto {
  @IsOptional()
  @IsUUID()
  lectureId?: string;

  @IsString()
  @MinLength(5)
  body!: string;
}

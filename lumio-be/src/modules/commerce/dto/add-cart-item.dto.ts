import { IsUUID } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  courseId!: string;
}

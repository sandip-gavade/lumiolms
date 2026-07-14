import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters.' })
  @MaxLength(72) // bcrypt's own input limit
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

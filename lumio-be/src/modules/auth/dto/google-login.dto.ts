import { IsString } from 'class-validator';

export class GoogleLoginDto {
  /** ID token from Google's Sign-In client SDK, verified server-side — never trust it as-is. */
  @IsString()
  idToken!: string;
}

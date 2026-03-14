import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  surname!: string;

  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

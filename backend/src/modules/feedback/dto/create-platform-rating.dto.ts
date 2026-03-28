import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePlatformRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

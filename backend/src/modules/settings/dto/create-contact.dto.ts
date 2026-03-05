import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateContactDto {
  @IsString()
  label: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  href?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

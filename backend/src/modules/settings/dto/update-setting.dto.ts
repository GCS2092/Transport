import { IsString, IsOptional } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;
}

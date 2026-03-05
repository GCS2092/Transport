import { IsString, IsEnum, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { Language } from '../../../common/enums/language.enum';

export class CreateFaqDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsEnum(Language)
  language: Language;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

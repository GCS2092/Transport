import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateRatingDto {
  @IsString()
  reservationCode: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  clientName: string;
}

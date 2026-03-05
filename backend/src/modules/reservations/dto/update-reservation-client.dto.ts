import {
  IsString,
  IsUUID,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class UpdateReservationClientDto {
  @IsString()
  cancelToken: string;

  @IsOptional()
  @IsUUID()
  pickupZoneId?: string;

  @IsOptional()
  @IsUUID()
  dropoffZoneId?: string;

  @IsOptional()
  @IsDateString()
  pickupDateTime?: string;

  @IsOptional()
  @IsDateString()
  returnDateTime?: string;

  @IsOptional()
  @IsString()
  flightNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  passengers?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

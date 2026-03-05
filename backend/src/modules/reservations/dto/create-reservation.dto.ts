import {
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { TripType } from '../../../common/enums/trip-type.enum';
import { Language } from '../../../common/enums/language.enum';

export class CreateReservationDto {
  @IsString()
  clientFirstName: string;

  @IsString()
  clientLastName: string;

  @IsEmail()
  clientEmail: string;

  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Invalid international phone format' })
  clientPhone: string;

  @IsEnum(TripType)
  tripType: TripType;

  @IsOptional()
  @IsUUID()
  pickupZoneId?: string;

  @IsOptional()
  @IsString()
  pickupCustomAddress?: string;

  @IsOptional()
  @IsNumber()
  pickupLatitude?: number;

  @IsOptional()
  @IsNumber()
  pickupLongitude?: number;

  @IsOptional()
  @IsUUID()
  dropoffZoneId?: string;

  @IsOptional()
  @IsString()
  dropoffCustomAddress?: string;

  @IsOptional()
  @IsNumber()
  dropoffLatitude?: number;

  @IsOptional()
  @IsNumber()
  dropoffLongitude?: number;

  @IsDateString()
  pickupDateTime: string;

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

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsString()
  promoCode?: string;
}

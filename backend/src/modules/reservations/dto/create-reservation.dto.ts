import {
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  IsOptional,
  IsNumber,
  IsBoolean,
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
  @IsNumber()
  clientLatitude?: number;

  @IsOptional()
  @IsNumber()
  clientLongitude?: number;

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
  @IsString()
  airlineCompany?: string;

  @IsOptional()
  @IsString()
  departureTime?: string;

  @IsOptional()
  @IsString()
  landingTime?: string;

  @IsOptional()
  @IsString()
  flightDetails?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  vehicleCount?: number;

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

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;
}

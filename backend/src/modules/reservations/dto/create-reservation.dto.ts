import {
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  IsOptional,
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

  @IsUUID()
  pickupZoneId: string;

  @IsUUID()
  dropoffZoneId: string;

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
}

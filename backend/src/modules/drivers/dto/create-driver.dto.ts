import { IsString, IsNotEmpty, IsEmail, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Invalid international phone format' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

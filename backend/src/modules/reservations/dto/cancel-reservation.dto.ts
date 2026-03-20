import { IsString, IsNotEmpty } from 'class-validator';

export class CancelReservationDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}



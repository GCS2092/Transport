import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReservationStatus } from '../../../common/enums/reservation-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

export class UpdateReservationDto {
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsUUID()
  driverId?: string;
}

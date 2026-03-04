import { IsEnum } from 'class-validator';
import { DriverStatus } from '../../../common/enums/driver-status.enum';

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatus, { message: `status must be one of: ${Object.values(DriverStatus).join(', ')}` })
  status: DriverStatus;
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { DriversModule } from '../drivers/drivers.module';
import { EmailLog } from '../notifications/entities/email-log.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailLog, Reservation]),
    UsersModule,
    DriversModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}

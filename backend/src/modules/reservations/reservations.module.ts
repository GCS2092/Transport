import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TariffsModule } from '../tariffs/tariffs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfModule } from '../pdf/pdf.module';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation]), TariffsModule, NotificationsModule, PdfModule, DriversModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}

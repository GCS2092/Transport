import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { Reservation } from './entities/reservation.entity';
import { DriverLocation } from '../drivers/entities/driver-location.entity';
import { TariffsModule } from '../tariffs/tariffs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfModule } from '../pdf/pdf.module';
import { DriversModule } from '../drivers/drivers.module';
import { AuditModule } from '../audit/audit.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, DriverLocation]),
    TariffsModule,
    NotificationsModule,
    PdfModule,
    DriversModule,
    AuditModule,
    PromoCodesModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}

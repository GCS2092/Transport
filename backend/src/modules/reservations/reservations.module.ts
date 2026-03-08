import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';          // ← ajoute cet import
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { Reservation } from './entities/reservation.entity';
import { DriverProposal } from './entities/driver-proposal.entity';
import { DriverLocation } from '../drivers/entities/driver-location.entity';
import { TariffsModule } from '../tariffs/tariffs.module';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfModule } from '../pdf/pdf.module';
import { DriversModule } from '../drivers/drivers.module';
import { AuditModule } from '../audit/audit.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, DriverLocation, DriverProposal]),
    JwtModule,          // ← ajoute cette ligne
    TariffsModule,
    SettingsModule,
    NotificationsModule,
    PdfModule,
    DriversModule,
    AuditModule,
    PromoCodesModule,
    UsersModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
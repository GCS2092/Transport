import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';          // ← ajoute cet import
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { MonthlyReportService } from './monthly-report.service';
import { Reservation } from './entities/reservation.entity';
import { ReservationArchive } from './entities/reservation-archive.entity';
import { DriverProposal } from './entities/driver-proposal.entity';
import { ClientInboxMessage } from './entities/client-inbox-message.entity';
import { DriverLocation } from '../drivers/entities/driver-location.entity';
import { Zone } from '../zones/entities/zone.entity';
import { InboxService } from './inbox.service';
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
    TypeOrmModule.forFeature([Reservation, ReservationArchive, DriverLocation, DriverProposal, ClientInboxMessage, Zone]),
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
  providers: [ReservationsService, MonthlyReportService, InboxService],
  exports: [ReservationsService, MonthlyReportService, InboxService],
})
export class ReservationsModule {}
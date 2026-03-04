import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { ReservationsModule } from '../reservations/reservations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfModule } from '../pdf/pdf.module';
import { RefreshToken } from '../auth/entities/refresh-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken]), ReservationsModule, NotificationsModule, PdfModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}

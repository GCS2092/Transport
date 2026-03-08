import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ReservationsService } from '../reservations/reservations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { RefreshToken } from '../auth/entities/refresh-token.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private reservationsService: ReservationsService,
    private notificationsService: NotificationsService,
    private pdfService: PdfService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  @Cron('0 8 * * *')
  async sendDailyReminders() {
    this.logger.log('Running J-1 reminder job...');
    try {
      const reservations = await this.reservationsService.findUpcomingForReminder();
      this.logger.log(`Found ${reservations.length} reservations for J-1 reminder`);

      for (const reservation of reservations) {
        await this.notificationsService.sendReminderJ1(reservation);
        await this.notificationsService.sendDriverReminderJ1(reservation);
      }
    } catch (error) {
      this.logger.error('J-1 reminder job failed', error?.message);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processExpiredProposals() {
    this.logger.log('Checking for expired driver proposals...');
    try {
      await this.reservationsService.processExpiredProposals();
    } catch (error) {
      this.logger.error('Failed to process expired proposals', error?.message);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanExpiredTokens() {
    this.logger.log('Cleaning expired/revoked refresh tokens...');
    try {
      const result = await this.refreshTokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });
      const revoked = await this.refreshTokenRepository.delete({ isRevoked: true });
      this.logger.log(
        `Cleanup done: ${result.affected} expired + ${revoked.affected} revoked tokens deleted`,
      );
    } catch (error) {
      this.logger.error('Token cleanup failed', error?.message);
    }
  }
}

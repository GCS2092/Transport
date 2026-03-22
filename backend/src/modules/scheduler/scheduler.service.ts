import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ReservationsService } from '../reservations/reservations.service';
import { MonthlyReportService } from '../reservations/monthly-report.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { NotificationType } from '../../common/enums/notification-type.enum';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private reservationsService: ReservationsService,
    private monthlyReportService: MonthlyReportService,
    private notificationsService: NotificationsService,
    private pdfService: PdfService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /** Le 1er de chaque mois à 8h : rapports PDF du mois précédent (chauffeurs + admins). */
  @Cron('0 8 1 * *')
  async sendMonthlyPdfReports() {
    this.logger.log('Running monthly PDF reports job...');
    try {
      const result = await this.monthlyReportService.generateAndSendMonthlyReports();
      this.logger.log(
        `Monthly reports done: period=${result.period}, drivers=${result.driversNotified}, admins=${result.adminsNotified}`,
      );
    } catch (error) {
      this.logger.error('Monthly PDF reports failed', error?.message);
    }
  }

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

  // Archivage automatique (anonymisation + XLSX + purge dashboard)
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async autoArchiveSensitiveData() {
    const enabled = (process.env.AUTO_ARCHIVE_ENABLED || 'true').toLowerCase() === 'true';
    const days = parseInt(process.env.ARCHIVE_AFTER_DAYS || '90', 10);
    if (!enabled) return;

    this.logger.log(`Running auto-archive job (olderThanDays=${days})...`);
    try {
      await this.reservationsService.archiveToExcelAndPurge({
        olderThanDays: days,
        statuses: [ReservationStatus.TERMINEE, ReservationStatus.ANNULEE],
        reason: 'auto',
      });
    } catch (error) {
      this.logger.error('Auto-archive job failed', error?.message);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sendH1Reminders() {
    this.logger.log('Running H-1 reminder job...');
    try {
      const reservations = await this.reservationsService.findUpcomingForH1Reminder();
      if (!reservations.length) return;

      for (const reservation of reservations) {
        const already = await this.notificationsService.hasSent(reservation.id, NotificationType.REMINDER_H1);
        if (already) continue;
        await this.notificationsService.sendReminderH1(reservation);
      }
    } catch (error) {
      this.logger.error('H-1 reminder job failed', error?.message);
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

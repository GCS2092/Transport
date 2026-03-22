import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { PdfService } from '../pdf/pdf.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { DriversService } from '../drivers/drivers.service';

/** Période calendaire (mois précédent si lancé le 1er du mois). */
export function getPreviousMonthBounds(reference: Date = new Date()): { start: Date; end: Date; labelFr: string } {
  const y = reference.getFullYear();
  const m = reference.getMonth(); // 0-11, si on est le 1er, m = mois courant → mois précédent = m-1
  const firstOfThisMonth = new Date(y, m, 1);
  const end = new Date(firstOfThisMonth.getTime() - 1);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const mois = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  const labelFr = `${mois[start.getMonth()]} ${start.getFullYear()}`;
  return { start, end, labelFr };
}

@Injectable()
export class MonthlyReportService {
  private readonly logger = new Logger(MonthlyReportService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    private readonly pdfService: PdfService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly driversService: DriversService,
  ) {}

  /**
   * Courses terminées dans la période (date de fin de course ou repli sur date de prise en charge).
   */
  private async loadCompletedReservationsForPeriod(start: Date, end: Date): Promise<Reservation[]> {
    return this.reservationsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.pickupZone', 'pickupZone')
      .leftJoinAndSelect('r.dropoffZone', 'dropoffZone')
      .leftJoinAndSelect('r.driver', 'driver')
      .where('r.status = :status', { status: ReservationStatus.TERMINEE })
      .andWhere('COALESCE(r.completedAt, r.pickupDateTime) BETWEEN :start AND :end', { start, end })
      .getMany();
  }

  async generateAndSendMonthlyReports(referenceDate: Date = new Date()): Promise<{
    driversNotified: number;
    adminsNotified: number;
    period: string;
  }> {
    const enabled = (process.env.MONTHLY_REPORT_ENABLED || 'true').toLowerCase() === 'true';
    if (!enabled) {
      this.logger.log('Monthly reports disabled (MONTHLY_REPORT_ENABLED=false)');
      return { driversNotified: 0, adminsNotified: 0, period: '' };
    }

    const { start, end, labelFr } = getPreviousMonthBounds(referenceDate);
    this.logger.log(`Monthly report for period ${labelFr} (${start.toISOString()} – ${end.toISOString()})`);

    const reservations = await this.loadCompletedReservationsForPeriod(start, end);
    const admins = await this.usersService.findAdmins();
    const adminEmails = admins.map(a => a.email).filter(Boolean);

    const byDriver = new Map<string, Reservation[]>();
    for (const r of reservations) {
      if (!r.driverId) continue;
      const list = byDriver.get(r.driverId) || [];
      list.push(r);
      byDriver.set(r.driverId, list);
    }

    const drivers = await this.driversService.findAll();
    let driversNotified = 0;

    for (const driver of drivers) {
      if (!driver.isActive || !driver.email) continue;
      const rides = byDriver.get(driver.id) || [];

      const pdfBuffer = await this.pdfService.generateDriverMonthlyReportPdf({
        driver,
        periodLabel: labelFr,
        start,
        end,
        rides,
      });

      await this.notificationsService.sendMonthlyDriverReportEmail(
        driver.email,
        driver.firstName,
        labelFr,
        pdfBuffer,
        driver.id,
      );
      driversNotified++;
    }

    const adminPdf = await this.pdfService.generateAdminMonthlyReportPdf({
      periodLabel: labelFr,
      start,
      end,
      reservations,
      allDrivers: drivers,
    });

    await this.notificationsService.sendMonthlyAdminReportEmail(adminEmails, labelFr, adminPdf);

    return {
      driversNotified,
      adminsNotified: adminEmails.length,
      period: labelFr,
    };
  }
}

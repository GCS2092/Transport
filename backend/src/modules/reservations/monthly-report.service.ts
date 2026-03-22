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
  const m = reference.getMonth();
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

    // Chauffeurs actifs uniquement (pour l'envoi des emails)
    const activeDrivers = await this.driversService.findAll();

    // Tous les chauffeurs y compris inactifs (pour rattacher les anciennes courses)
    const allDrivers = await this.driversService.findAllIncludingInactive();

    // Index email → driverId actif
    const emailToActiveDriverId = new Map<string, string>();
    for (const driver of activeDrivers) {
      if (driver.email) emailToActiveDriverId.set(driver.email, driver.id);
    }

    // Index driverId → email (tous chauffeurs y compris inactifs)
    const driverIdToEmail = new Map<string, string>();
    for (const driver of allDrivers) {
      if (driver.email) driverIdToEmail.set(driver.id, driver.email);
    }

    // Rattacher chaque course au chauffeur ACTIF qui partage le même email
    const byDriver = new Map<string, Reservation[]>();
    for (const r of reservations) {
      if (!r.driverId) continue;

      const courseDriverEmail = driverIdToEmail.get(r.driverId);
      if (!courseDriverEmail) continue;

      // Si la course appartient à un doublon inactif, on la rattache au chauffeur actif
      const targetDriverId = emailToActiveDriverId.get(courseDriverEmail) ?? r.driverId;

      const list = byDriver.get(targetDriverId) || [];
      list.push(r);
      byDriver.set(targetDriverId, list);
    }

    let driversNotified = 0;
    const seenEmails = new Set<string>();

    for (const driver of activeDrivers) {
      if (!driver.email) continue;
      if (seenEmails.has(driver.email)) {
        this.logger.warn(`Skipping duplicate email for driver ${driver.firstName} ${driver.lastName} (${driver.email})`);
        continue;
      }
      seenEmails.add(driver.email);

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
      allDrivers: activeDrivers,
    });

    await this.notificationsService.sendMonthlyAdminReportEmail(adminEmails, labelFr, adminPdf);

    return {
      driversNotified,
      adminsNotified: adminEmails.length,
      period: labelFr,
    };
  }
}
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Reservation } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { TariffsService } from '../tariffs/tariffs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { DriversService } from '../drivers/drivers.service';
import { AuditService } from '../audit/audit.service';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { DriverStatus } from '../../common/enums/driver-status.enum';
import { Language } from '../../common/enums/language.enum';

export interface FindAllFilters {
  page?: number;
  limit?: number;
  status?: ReservationStatus;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    private tariffsService: TariffsService,
    private notificationsService: NotificationsService,
    private pdfService: PdfService,
    private driversService: DriversService,
    private auditService: AuditService,
  ) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'VTC-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async create(dto: CreateReservationDto): Promise<Reservation> {
    const tariff = await this.tariffsService.findByZones(dto.pickupZoneId, dto.dropoffZoneId);
    if (!tariff) {
      throw new BadRequestException('No active tariff found for this zone pair');
    }

    await this.checkDailyLimit(dto.clientEmail);

    let code: string;
    let codeExists = true;
    while (codeExists) {
      code = this.generateCode();
      const existing = await this.reservationsRepository.findOne({ where: { code } });
      codeExists = !!existing;
    }

    const cancelToken = uuidv4();
    const cancelTokenExpiresAt = new Date(dto.pickupDateTime);

    const reservation = this.reservationsRepository.create({
      ...dto,
      code,
      amount: tariff.price,
      language: dto.language || Language.FR,
      cancelToken,
      cancelTokenExpiresAt,
      passengers: dto.passengers || 1,
    });

    const saved = await this.reservationsRepository.save(reservation);

    setImmediate(async () => {
      try {
        await this.notificationsService.sendReservationConfirmed(saved);
      } catch (e) {
        this.logger.error('Failed to send confirmation email', e?.message);
      }
    });

    return saved;
  }

  private async checkDailyLimit(email: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await this.reservationsRepository
      .createQueryBuilder('r')
      .where('r.clientEmail = :email', { email })
      .andWhere('r.createdAt >= :today', { today })
      .andWhere('r.createdAt < :tomorrow', { tomorrow })
      .andWhere('r.status != :cancelled', { cancelled: ReservationStatus.ANNULEE })
      .getCount();

    if (count >= 3) {
      throw new BadRequestException('Maximum 3 reservations per email per day');
    }
  }

  async findAll(filters: FindAllFilters = {}): Promise<{ data: Reservation[]; total: number }> {
    const { page = 1, limit = 20, status, driverId, dateFrom, dateTo } = filters;
    const qb = this.reservationsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.pickupZone', 'pickupZone')
      .leftJoinAndSelect('r.dropoffZone', 'dropoffZone')
      .leftJoinAndSelect('r.driver', 'driver')
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('r.status = :status', { status });
    if (driverId) qb.andWhere('r.driverId = :driverId', { driverId });
    if (dateFrom) qb.andWhere('r.pickupDateTime >= :dateFrom', { dateFrom: new Date(dateFrom) });
    if (dateTo) qb.andWhere('r.pickupDateTime <= :dateTo', { dateTo: new Date(dateTo) });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findByCode(code: string): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({ where: { code } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async findById(id: string): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async findByDriver(driverId: string): Promise<Reservation[]> {
    return this.reservationsRepository.find({
      where: { driverId },
      order: { pickupDateTime: 'ASC' },
    });
  }

  async assignDriver(id: string, driverId: string): Promise<Reservation> {
    const reservation = await this.findById(id);
    if (reservation.status !== ReservationStatus.EN_ATTENTE) {
      throw new BadRequestException('Can only assign driver to pending reservations');
    }

    const driver = await this.driversService.findById(driverId);
    if (!driver.isActive) {
      throw new BadRequestException('Driver is inactive');
    }
    if (driver.status !== DriverStatus.DISPONIBLE) {
      throw new BadRequestException(
        `Driver is not available (current status: ${driver.status})`,
      );
    }
    await this.reservationsRepository.update(id, {
      driverId,
      status: ReservationStatus.ASSIGNEE,
    });
    await this.driversService.updateStatus(driverId, DriverStatus.EN_COURSE);
    const updated = await this.findById(id);

    // Audit log
    await this.auditService.log({
      userId: null,
      action: 'ASSIGN_DRIVER',
      entityType: 'Reservation',
      entityId: id,
      oldData: { driverId: reservation.driverId, status: reservation.status },
      newData: { driverId, status: ReservationStatus.ASSIGNEE },
      description: `Driver ${driver.firstName} ${driver.lastName} assigned to reservation ${reservation.code}`,
    });

    setImmediate(async () => {
      try {
        await this.notificationsService.sendDriverAssigned(updated);
        await this.notificationsService.sendDriverNewRide(updated);
      } catch (e) {
        this.logger.error('Failed to send driver assigned emails', e?.message);
      }
    });

    return updated;
  }

  async updateStatus(id: string, dto: UpdateReservationDto): Promise<Reservation> {
    const reservation = await this.findById(id);

    const updates: Partial<Reservation> = {};
    if (dto.status) updates.status = dto.status;
    if (dto.paymentStatus) updates.paymentStatus = dto.paymentStatus;
    if (dto.driverId) updates.driverId = dto.driverId;

    if (dto.status === ReservationStatus.EN_COURS) {
      updates.startedAt = new Date();
    }
    if (dto.status === ReservationStatus.TERMINEE) {
      updates.completedAt = new Date();
    }

    await this.reservationsRepository.update(id, updates);

    // Audit log
    await this.auditService.log({
      userId: null,
      action: 'UPDATE_STATUS',
      entityType: 'Reservation',
      entityId: id,
      oldData: { status: reservation.status, paymentStatus: reservation.paymentStatus },
      newData: { status: dto.status, paymentStatus: dto.paymentStatus },
      description: `Reservation ${reservation.code} status updated`,
    });

    if (
      (dto.status === ReservationStatus.TERMINEE || dto.status === ReservationStatus.ANNULEE) &&
      reservation.driverId
    ) {
      await this.driversService.updateStatus(reservation.driverId, DriverStatus.DISPONIBLE);
    }
    const updated = await this.findById(id);

    if (dto.status === ReservationStatus.TERMINEE) {
      setImmediate(async () => {
        try {
          const pdfBuffer = await this.pdfService.generateReceipt(updated);
          await this.notificationsService.sendRideCompleted(updated, pdfBuffer);
        } catch (e) {
          this.logger.error('Failed to send ride completed email', e?.message);
        }
      });
    }

    if (dto.status === ReservationStatus.ANNULEE) {
      setImmediate(async () => {
        try {
          await this.notificationsService.sendReservationCancelled(updated);
          await this.notificationsService.sendDriverCancelled(updated);
        } catch (e) {
          this.logger.error('Failed to send cancellation email', e?.message);
        }
      });
    }

    return updated;
  }

  async cancelByToken(code: string, token: string): Promise<Reservation> {
    const reservation = await this.findByCode(code);

    if (reservation.cancelToken !== token) {
      throw new ForbiddenException('Invalid cancellation token');
    }
    if (reservation.cancelTokenExpiresAt < new Date()) {
      throw new BadRequestException('Cancellation token has expired');
    }
    if (reservation.status === ReservationStatus.ANNULEE) {
      throw new BadRequestException('Reservation is already cancelled');
    }
    if (reservation.status === ReservationStatus.TERMINEE) {
      throw new BadRequestException('Cannot cancel a completed reservation');
    }

    await this.reservationsRepository.update(reservation.id, {
      status: ReservationStatus.ANNULEE,
      cancelToken: null,
    });
    if (reservation.driverId) {
      await this.driversService.updateStatus(reservation.driverId, DriverStatus.DISPONIBLE);
    }
    const updated = await this.findById(reservation.id);

    setImmediate(async () => {
      try {
        await this.notificationsService.sendReservationCancelled(updated);
        await this.notificationsService.sendDriverCancelled(updated);
      } catch (e) {
        this.logger.error('Failed to send cancellation email', e?.message);
      }
    });

    return updated;
  }

  async cancelByAdmin(id: string): Promise<Reservation> {
    const reservation = await this.findById(id);
    if (reservation.status === ReservationStatus.ANNULEE) {
      throw new BadRequestException('Already cancelled');
    }
    await this.reservationsRepository.update(id, { status: ReservationStatus.ANNULEE });
    
    // Audit log
    await this.auditService.log({
      userId: null,
      action: 'CANCEL',
      entityType: 'Reservation',
      entityId: id,
      oldData: { status: reservation.status },
      newData: { status: ReservationStatus.ANNULEE },
      description: `Reservation ${reservation.code} cancelled by admin`,
    });
    
    if (reservation.driverId) {
      await this.driversService.updateStatus(reservation.driverId, DriverStatus.DISPONIBLE);
    }
    const updated = await this.findById(id);

    setImmediate(async () => {
      try {
        await this.notificationsService.sendReservationCancelled(updated);
        await this.notificationsService.sendDriverCancelled(updated);
      } catch (e) {
        this.logger.error('Failed to send cancellation email', e?.message);
      }
    });

    return updated;
  }

  async findUpcomingForReminder(): Promise<Reservation[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayStart = new Date(tomorrow);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(tomorrow);
    dayEnd.setHours(23, 59, 59, 999);

    return this.reservationsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.driver', 'driver')
      .leftJoinAndSelect('r.pickupZone', 'pickupZone')
      .leftJoinAndSelect('r.dropoffZone', 'dropoffZone')
      .where('r.pickupDateTime >= :start', { start: dayStart })
      .andWhere('r.pickupDateTime <= :end', { end: dayEnd })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [ReservationStatus.EN_ATTENTE, ReservationStatus.ASSIGNEE],
      })
      .getMany();
  }

  async exportToCsv(filters: Omit<FindAllFilters, 'page' | 'limit'>): Promise<string> {
    const qb = this.reservationsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.pickupZone', 'pickupZone')
      .leftJoinAndSelect('r.dropoffZone', 'dropoffZone')
      .leftJoinAndSelect('r.driver', 'driver')
      .orderBy('r.createdAt', 'DESC');

    if (filters.status) qb.andWhere('r.status = :status', { status: filters.status });
    if (filters.driverId) qb.andWhere('r.driverId = :driverId', { driverId: filters.driverId });
    if (filters.dateFrom) qb.andWhere('r.pickupDateTime >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    if (filters.dateTo) qb.andWhere('r.pickupDateTime <= :dateTo', { dateTo: new Date(filters.dateTo) });

    const reservations = await qb.getMany();

    const headers = [
      'Code',
      'Date création',
      'Date pickup',
      'Statut',
      'Client nom',
      'Client email',
      'Client téléphone',
      'Zone départ',
      'Zone arrivée',
      'Montant',
      'Passagers',
      'Chauffeur',
      'Type véhicule',
      'Paiement',
      'Notes',
    ];

    const rows = reservations.map(r => [
      r.code,
      new Date(r.createdAt).toLocaleString('fr-FR'),
      new Date(r.pickupDateTime).toLocaleString('fr-FR'),
      r.status,
      `${r.clientFirstName} ${r.clientLastName}`,
      r.clientEmail,
      r.clientPhone,
      r.pickupZone?.name || '',
      r.dropoffZone?.name || '',
      r.amount.toString(),
      r.passengers.toString(),
      r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : '',
      r.driver?.vehicleType || '',
      r.paymentStatus,
      r.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  async archiveCompleted(olderThanDays: number): Promise<{ archived: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.reservationsRepository
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', {
        statuses: [ReservationStatus.TERMINEE, ReservationStatus.ANNULEE],
      })
      .andWhere('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return { archived: result.affected || 0 };
  }

  async updateReservation(id: string, updates: Partial<CreateReservationDto>): Promise<Reservation> {
    const reservation = await this.findById(id);
    
    const updateData: any = { ...updates };
    
    if (updates.pickupZoneId && updates.dropoffZoneId) {
      const tariff = await this.tariffsService.findByZones(updates.pickupZoneId, updates.dropoffZoneId);
      if (tariff) {
        updateData.amount = tariff.price;
      }
    }

    await this.reservationsRepository.update(id, updateData);
    
    // Audit log
    await this.auditService.log({
      userId: null,
      action: 'UPDATE',
      entityType: 'Reservation',
      entityId: id,
      oldData: reservation,
      newData: updateData,
      description: `Reservation ${reservation.code} updated by admin`,
    });
    
    return this.findById(id);
  }
}

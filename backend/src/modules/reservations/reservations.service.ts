import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Reservation } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { TariffsService } from '../tariffs/tariffs.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { DriversService } from '../drivers/drivers.service';
import { AuditService } from '../audit/audit.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { DriverLocation } from '../drivers/entities/driver-location.entity';
import { v4 as uuidv4 } from 'uuid';
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
    @InjectRepository(DriverLocation)
    private driverLocationRepository: Repository<DriverLocation>,
    private tariffsService: TariffsService,
    private settingsService: SettingsService,
    private notificationsService: NotificationsService,
    private pdfService: PdfService,
    private driversService: DriversService,
    private auditService: AuditService,
    private promoCodesService: PromoCodesService,
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
    // Validation des zones
    if (!dto.pickupZoneId && !dto.pickupCustomAddress) {
      throw new BadRequestException('Pickup zone or custom address is required');
    }
    
    if (!dto.dropoffZoneId && !dto.dropoffCustomAddress) {
      throw new BadRequestException('Dropoff zone or custom address is required');
    }

    // Calcul du prix fixe selon le type de trajet
    const finalPrice = await this.settingsService.getPriceForTripType(dto.tripType);
    this.logger.log(`Using fixed price for ${dto.tripType}: ${finalPrice} FCFA`);

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

    // Validation et application du code promo
    let finalAmount = finalPrice;
    let discount = 0;
    let promoCode = null;
    let originalAmount = null;

    if (dto.promoCode) {
      const promoResult = await this.promoCodesService.validateAndApply(dto.promoCode, finalPrice);
      if (promoResult.valid) {
        discount = promoResult.discount;
        finalAmount = finalPrice - discount;
        promoCode = dto.promoCode.toUpperCase();
        originalAmount = finalPrice;
        // Incrémenter le compteur d'utilisation
        await this.promoCodesService.incrementUsage(promoCode);
      } else {
        throw new BadRequestException(promoResult.message || 'Code promo invalide');
      }
    }

    const reservation = this.reservationsRepository.create({
      ...dto,
      code,
      amount: finalAmount,
      originalAmount,
      discount,
      promoCode,
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

    // Assignation automatique si demandée
    if (dto.autoAssign) {
      try {
        this.logger.log(`Auto-assigning driver for reservation ${saved.code}`);
        const assigned = await this.autoAssignDriver(saved.id);
        return assigned;
      } catch (err) {
        this.logger.warn(`Auto-assignment failed for ${saved.code}: ${err.message}`);
        // Retourner la réservation même si l'assignation échoue
        return saved;
      }
    }

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
    const reservation = await this.reservationsRepository.findOne({
      where: { code },
      relations: ['pickupZone', 'dropoffZone', 'driver'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async findById(id: string): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: ['pickupZone', 'dropoffZone', 'driver'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async findByDriver(driverId: string): Promise<Reservation[]> {
    return this.reservationsRepository.find({
      where: { driverId },
      order: { pickupDateTime: 'ASC' },
      relations: ['pickupZone', 'dropoffZone'],
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

  // Assignation automatique du chauffeur le plus proche
  async autoAssignDriver(reservationId: string): Promise<Reservation> {
    const reservation = await this.findById(reservationId);

    if (reservation.status !== ReservationStatus.EN_ATTENTE) {
      throw new BadRequestException('Only pending reservations can be auto-assigned');
    }

    const availableDrivers = await this.driversService.findAvailable();

    if (availableDrivers.length === 0) {
      throw new BadRequestException('No available drivers');
    }

    // Priorité: GPS précis du client > coordonnées du pickup custom > centre de la zone
    const pickupLat = Number(reservation.clientLatitude)
      || Number(reservation.pickupLatitude)
      || Number(reservation.pickupZone?.latitude);
    const pickupLng = Number(reservation.clientLongitude)
      || Number(reservation.pickupLongitude)
      || Number(reservation.pickupZone?.longitude);

    if (!pickupLat || !pickupLng) {
      this.logger.warn(`No GPS coordinates for reservation ${reservation.code}, assigning first available driver`);
      return this.assignDriver(reservationId, availableDrivers[0].id);
    }

    // Pour chaque chauffeur: GPS temps réel, sinon dropoff de sa dernière course terminée
    const driversWithDistance = await Promise.all(
      availableDrivers.map(async (driver) => {
        try {
          // 1. Position GPS temps réel (< 30 min)
          const location = await this.driverLocationRepository.findOne({
            where: { driverId: driver.id },
            order: { updatedAt: 'DESC' },
          });

          if (location) {
            const ageMs = Date.now() - new Date(location.updatedAt).getTime();
            if (ageMs < 30 * 60 * 1000) { // GPS récent (< 30 min)
              const distance = this.calculateDistance(
                pickupLat, pickupLng,
                Number(location.latitude), Number(location.longitude),
              );
              return { driver, distance, source: 'gps' };
            }
          }

          // 2. Fallback: dropoff de la dernière course terminée
          const lastRide = await this.reservationsRepository.findOne({
            where: { driverId: driver.id, status: ReservationStatus.TERMINEE },
            order: { completedAt: 'DESC' },
          });

          if (lastRide) {
            const dropLat = Number(lastRide.dropoffLatitude) || Number(lastRide.dropoffZone?.latitude);
            const dropLng = Number(lastRide.dropoffLongitude) || Number(lastRide.dropoffZone?.longitude);
            if (dropLat && dropLng) {
              const distance = this.calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
              return { driver, distance, source: 'last_ride' };
            }
          }

          return { driver, distance: Infinity, source: 'none' };
        } catch {
          return { driver, distance: Infinity, source: 'none' };
        }
      }),
    );

    driversWithDistance.sort((a, b) => a.distance - b.distance);
    const closest = driversWithDistance[0];

    if (closest.distance === Infinity) {
      this.logger.warn(`No drivers with GPS location, assigning first available driver`);
      return this.assignDriver(reservationId, availableDrivers[0].id);
    }

    this.logger.log(
      `Auto-assigning driver ${closest.driver.firstName} ${closest.driver.lastName} ` +
      `(${closest.distance.toFixed(2)} km, source: ${closest.source}) to reservation ${reservation.code}`,
    );

    return this.assignDriver(reservationId, closest.driver.id);
  }

  // Formule de Haversine pour calculer la distance entre deux points GPS
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async generateReceipt(reservation: Reservation): Promise<Buffer> {
    return this.pdfService.generateReceipt(reservation);
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

    // Envoyer des emails selon le changement de statut
    setImmediate(async () => {
      try {
        if (dto.status === ReservationStatus.EN_COURS) {
          await this.notificationsService.sendRideStarted(updated);
        } else if (dto.status === ReservationStatus.TERMINEE) {
          const pdfBuffer = await this.pdfService.generateReceipt(updated);
          await this.notificationsService.sendRideCompleted(updated, pdfBuffer);
        }
      } catch (e) {
        this.logger.error('Failed to send status change email', e?.message);
      }
    });

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

  async updateByClient(code: string, token: string, updates: any): Promise<Reservation> {
    const reservation = await this.findByCode(code);

    if (reservation.cancelToken !== token) {
      throw new ForbiddenException('Invalid token');
    }
    if (reservation.cancelTokenExpiresAt < new Date()) {
      throw new BadRequestException('Token has expired');
    }
    if (reservation.status !== ReservationStatus.EN_ATTENTE) {
      throw new BadRequestException('Can only modify reservations that are pending');
    }

    const updateData: any = {};
    
    if (updates.pickupZoneId) updateData.pickupZoneId = updates.pickupZoneId;
    if (updates.dropoffZoneId) updateData.dropoffZoneId = updates.dropoffZoneId;
    if (updates.pickupDateTime) updateData.pickupDateTime = updates.pickupDateTime;
    if (updates.returnDateTime !== undefined) updateData.returnDateTime = updates.returnDateTime;
    if (updates.flightNumber !== undefined) updateData.flightNumber = updates.flightNumber;
    if (updates.passengers) updateData.passengers = updates.passengers;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    // Recalculer le prix selon le type de trajet (prix fixe)
    if (updates.tripType || updates.pickupZoneId || updates.dropoffZoneId) {
      const tripType = updates.tripType || reservation.tripType;
      updateData.amount = await this.settingsService.getPriceForTripType(tripType);
    }

    await this.reservationsRepository.update(reservation.id, updateData);
    return this.findById(reservation.id);
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

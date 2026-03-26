import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThan } from 'typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationArchive } from './entities/reservation-archive.entity';
import { DriverProposal, ProposalStatus } from './entities/driver-proposal.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { TariffsService } from '../tariffs/tariffs.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { DriversService } from '../drivers/drivers.service';
import { AuditService } from '../audit/audit.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { UsersService } from '../users/users.service';
import { DriverLocation } from '../drivers/entities/driver-location.entity';
import { v4 as uuidv4 } from 'uuid';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { DriverStatus } from '../../common/enums/driver-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { Language } from '../../common/enums/language.enum';
import { createHash } from 'crypto';
import ExcelJS from 'exceljs';

export interface FindAllFilters {
  page?: number;
  limit?: number;
  status?: ReservationStatus;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaymentSupervisionFilters {
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(ReservationArchive)
    private reservationArchiveRepository: Repository<ReservationArchive>,
    @InjectRepository(DriverLocation)
    private driverLocationRepository: Repository<DriverLocation>,
    @InjectRepository(DriverProposal)
    private driverProposalRepository: Repository<DriverProposal>,
    private tariffsService: TariffsService,
    private settingsService: SettingsService,
    private notificationsService: NotificationsService,
    private pdfService: PdfService,
    private driversService: DriversService,
    private auditService: AuditService,
    private promoCodesService: PromoCodesService,
    private usersService: UsersService,
  ) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'VTC-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateCancelToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  async create(dto: CreateReservationDto): Promise<Reservation> {
    if (!dto.pickupZoneId && !dto.pickupCustomAddress) {
      throw new BadRequestException('Pickup zone or custom address is required');
    }
    if (!dto.dropoffZoneId && !dto.dropoffCustomAddress) {
      throw new BadRequestException('Dropoff zone or custom address is required');
    }

    const basePrice = await this.settingsService.getPriceForTripType(dto.tripType);
    
    // Calcul du nombre de véhicules nécessaires (4 passagers max par véhicule)
    const passengers = dto.passengers || 1;
    const calculatedVehicleCount = Math.ceil(passengers / 4);
    const vehicleCount = dto.vehicleCount || calculatedVehicleCount;
    
    // Prix final = prix de base × nombre de véhicules
    const finalPrice = basePrice * vehicleCount;
    this.logger.log(`Using fixed price for ${dto.tripType}: ${basePrice} FCFA × ${vehicleCount} vehicle(s) = ${finalPrice} FCFA`);

    await this.checkDailyLimit(dto.clientEmail);

    let code: string;
    let codeExists = true;
    while (codeExists) {
      code = this.generateCode();
      const existing = await this.reservationsRepository.findOne({ where: { code } });
      codeExists = !!existing;
    }

    const cancelToken = this.generateCancelToken();
    const cancelTokenExpiresAt = new Date(dto.pickupDateTime);

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
      passengers: passengers,
      vehicleCount: vehicleCount,
      airlineCompany: dto.airlineCompany || null,
      departureTime: dto.departureTime || null,
      landingTime: dto.landingTime || null,
      flightDetails: dto.flightDetails || null,
    });

    const saved = await this.reservationsRepository.save(reservation);

    // ✅ FIX : recharger avec les relations pour que l'email ait accès aux zones et au cancelToken
    const savedWithRelations = await this.findById(saved.id);

    setImmediate(async () => {
      try {
        await this.notificationsService.sendReservationConfirmed(savedWithRelations);
        const admins = await this.usersService.findAdmins();
        const adminEmails = admins.map(a => a.email);
        await this.notificationsService.sendAdminNewReservation(savedWithRelations, adminEmails);
      } catch (e) {
        this.logger.error('Failed to send confirmation email', JSON.stringify(e));
      }
    });

    if (dto.autoAssign) {
      try {
        this.logger.log(`Auto-assigning driver for reservation ${saved.code}`);
        const assigned = await this.autoAssignDriver(saved.id);
        return assigned;
      } catch (err) {
        this.logger.warn(`Auto-assignment failed for ${saved.code}: ${err.message}`);
        return savedWithRelations;
      }
    }

    return savedWithRelations;
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
    if (!driver.isActive) throw new BadRequestException('Driver is inactive');
    if (driver.status !== DriverStatus.DISPONIBLE) {
      throw new BadRequestException(`Driver is not available (current status: ${driver.status})`);
    }

    await this.reservationsRepository.update(id, { driverId, status: ReservationStatus.ASSIGNEE });
    await this.driversService.updateStatus(driverId, DriverStatus.EN_COURSE);
    const updated = await this.findById(id);

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
        const admins = await this.usersService.findAdmins();
        const adminEmails = admins.map(a => a.email);
        await this.notificationsService.sendAdminDriverAssigned(updated, adminEmails);
      } catch (e) {
        this.logger.error('Failed to send driver assigned emails', JSON.stringify(e));
      }
    });

    return updated;
  }

  async autoAssignDriver(reservationId: string): Promise<Reservation> {
    const reservation = await this.findById(reservationId);
    if (reservation.status !== ReservationStatus.EN_ATTENTE) {
      throw new BadRequestException('Only pending reservations can be auto-assigned');
    }

    const availableDrivers = await this.driversService.findAvailable();
    if (availableDrivers.length === 0) throw new BadRequestException('No available drivers');

    const pickupLat = Number(reservation.clientLatitude) || Number(reservation.pickupLatitude) || Number(reservation.pickupZone?.latitude);
    const pickupLng = Number(reservation.clientLongitude) || Number(reservation.pickupLongitude) || Number(reservation.pickupZone?.longitude);

    if (!pickupLat || !pickupLng) {
      this.logger.warn(`No GPS coordinates for reservation ${reservation.code}, assigning first available driver`);
      return this.assignDriver(reservationId, availableDrivers[0].id);
    }

    const driversWithDistance = await Promise.all(
      availableDrivers.map(async (driver) => {
        try {
          const location = await this.driverLocationRepository.findOne({
            where: { driverId: driver.id },
            order: { updatedAt: 'DESC' },
          });
          if (location) {
            const ageMs = Date.now() - new Date(location.updatedAt).getTime();
            if (ageMs < 30 * 60 * 1000) {
              const distance = this.calculateDistance(pickupLat, pickupLng, Number(location.latitude), Number(location.longitude));
              return { driver, distance, source: 'gps' };
            }
          }
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

    this.logger.log(`Auto-assigning driver ${closest.driver.firstName} ${closest.driver.lastName} (${closest.distance.toFixed(2)} km, source: ${closest.source}) to reservation ${reservation.code}`);
    return this.assignDriver(reservationId, closest.driver.id);
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    if (dto.status === ReservationStatus.EN_COURS) updates.startedAt = new Date();
    if (dto.status === ReservationStatus.TERMINEE) updates.completedAt = new Date();

    await this.reservationsRepository.update(id, updates);

    await this.auditService.log({
      userId: null,
      action: 'UPDATE_STATUS',
      entityType: 'Reservation',
      entityId: id,
      oldData: { status: reservation.status, paymentStatus: reservation.paymentStatus },
      newData: { status: dto.status, paymentStatus: dto.paymentStatus },
      description: `Reservation ${reservation.code} status updated`,
    });

    if ((dto.status === ReservationStatus.TERMINEE || dto.status === ReservationStatus.ANNULEE) && reservation.driverId) {
      await this.driversService.updateStatus(reservation.driverId, DriverStatus.DISPONIBLE);
    }

    const updated = await this.findById(id);

    setImmediate(async () => {
      try {
        if (dto.status === ReservationStatus.EN_COURS) {
          await this.notificationsService.sendRideStarted(updated);
        } else if (dto.status === ReservationStatus.TERMINEE) {
          const pdfBuffer = await this.pdfService.generateReceipt(updated);
          await this.notificationsService.sendRideCompleted(updated, pdfBuffer);
        }
      } catch (e) {
        this.logger.error('Failed to send status change email', JSON.stringify(e));
      }
    });

    if (dto.paymentStatus === PaymentStatus.IMPAYE && reservation.paymentStatus !== PaymentStatus.IMPAYE) {
      setImmediate(async () => {
        try { await this.notifyAdminUnpaidRide(updated); } catch (e) {
          this.logger.error('Failed to send unpaid ride notification', JSON.stringify(e));
        }
      });
    }

    if (dto.status === ReservationStatus.ANNULEE) {
      setImmediate(async () => {
        try {
          await this.notificationsService.sendReservationCancelled(updated);
          await this.notificationsService.sendDriverCancelled(updated);
        } catch (e) {
          this.logger.error('Failed to send cancellation email', JSON.stringify(e));
        }
      });
    }

    return updated;
  }

  async updateByClient(code: string, token: string, updates: any): Promise<Reservation> {
    const reservation = await this.findByCode(code);

    if (reservation.cancelToken !== token) throw new ForbiddenException('Invalid token');
    if (reservation.cancelTokenExpiresAt < new Date()) throw new BadRequestException('Token has expired');
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

    if (updates.tripType || updates.pickupZoneId || updates.dropoffZoneId) {
      const tripType = updates.tripType || reservation.tripType;
      updateData.amount = await this.settingsService.getPriceForTripType(tripType);
    }

    await this.reservationsRepository.update(reservation.id, updateData);
    return this.findById(reservation.id);
  }

  // ─── Renvoi du code d'annulation par email ────────────────────────────────
  async resendCancelToken(code: string): Promise<{ message: string }> {
    const reservation = await this.findByCode(code);

    if (reservation.status === ReservationStatus.ANNULEE) {
      throw new BadRequestException('Cette réservation est déjà annulée');
    }
    if (reservation.status === ReservationStatus.TERMINEE) {
      throw new BadRequestException('Cette réservation est déjà terminée');
    }

    if (!reservation.cancelToken) {
      // Ancienne réservation sans token : en générer un nouveau
      const newToken = this.generateCancelToken();
      const newExpiry = new Date(reservation.pickupDateTime);
      await this.reservationsRepository.update(reservation.id, {
        cancelToken: newToken,
        cancelTokenExpiresAt: newExpiry,
      });
      const updated = await this.findById(reservation.id);
      await this.notificationsService.sendCancelTokenReminder(updated);
    } else {
      // Token existe déjà, juste le renvoyer
      await this.notificationsService.sendCancelTokenReminder(reservation);
    }

    // Le token n'est JAMAIS retourné dans la réponse HTTP
    return { message: "Code d'annulation envoyé par email" };
  }

  async cancelByToken(code: string, token: string): Promise<Reservation> {
    const reservation = await this.findByCode(code);

    if (reservation.cancelToken !== token) throw new ForbiddenException('Invalid cancellation token');
    if (reservation.cancelTokenExpiresAt < new Date()) throw new BadRequestException('Cancellation token has expired');
    if (reservation.status === ReservationStatus.ANNULEE) throw new BadRequestException('Reservation is already cancelled');
    if (reservation.status === ReservationStatus.TERMINEE) throw new BadRequestException('Cannot cancel a completed reservation');

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
        this.logger.error('Failed to send cancellation email', JSON.stringify(e));
      }
    });

    return updated;
  }

  async cancelByAdmin(id: string): Promise<Reservation> {
    const reservation = await this.findById(id);
    if (reservation.status === ReservationStatus.ANNULEE) throw new BadRequestException('Already cancelled');

    await this.reservationsRepository.update(id, { status: ReservationStatus.ANNULEE });

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
        this.logger.error('Failed to send cancellation email', JSON.stringify(e));
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
      .andWhere('r.status IN (:...statuses)', { statuses: [ReservationStatus.EN_ATTENTE, ReservationStatus.ASSIGNEE] })
      .getMany();
  }

  async findUpcomingForH1Reminder(): Promise<Reservation[]> {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 1000);

    return this.reservationsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.driver', 'driver')
      .leftJoinAndSelect('r.pickupZone', 'pickupZone')
      .leftJoinAndSelect('r.dropoffZone', 'dropoffZone')
      .where('r.pickupDateTime >= :start', { start })
      .andWhere('r.pickupDateTime < :end', { end })
      .andWhere('r.status IN (:...statuses)', { statuses: [ReservationStatus.EN_ATTENTE, ReservationStatus.ASSIGNEE] })
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
    const headers = ['Code', 'Date création', 'Date pickup', 'Statut', 'Client nom', 'Client email', 'Client téléphone', 'Zone départ', 'Zone arrivée', 'Montant', 'Passagers', 'Chauffeur', 'Type véhicule', 'Paiement', 'Notes'];
    const rows = reservations.map(r => [
      r.code, new Date(r.createdAt).toLocaleString('fr-FR'), new Date(r.pickupDateTime).toLocaleString('fr-FR'),
      r.status, `${r.clientFirstName} ${r.clientLastName}`, r.clientEmail, r.clientPhone,
      r.pickupZone?.name || '', r.dropoffZone?.name || '', r.amount.toString(), r.passengers.toString(),
      r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : '', r.driver?.vehicleType || '',
      r.paymentStatus, r.notes || '',
    ]);
    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  }

  async archiveCompleted(olderThanDays: number): Promise<{ archived: number }> {
    const { archived } = await this.archiveToExcelAndPurge({
      olderThanDays,
      statuses: [ReservationStatus.TERMINEE, ReservationStatus.ANNULEE],
      reason: 'manual',
    });
    return { archived };
  }

  private hashClient(email?: string | null): string | null {
    if (!email) return null;
    const salt = process.env.ARCHIVE_HASH_SALT || 'wendd-transport';
    return createHash('sha256').update(`${salt}:${email.trim().toLowerCase()}`).digest('hex');
  }

  async archiveToExcelAndPurge(opts: { olderThanDays: number; statuses: ReservationStatus[]; reason: 'manual' | 'auto' }): Promise<{ archived: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - opts.olderThanDays);

    const rows = await this.reservationsRepository.find({
      where: { status: In(opts.statuses), createdAt: LessThan(cutoffDate) } as any,
      relations: ['pickupZone', 'dropoffZone', 'driver'],
      order: { createdAt: 'ASC' },
    });

    if (!rows.length) return { archived: 0 };

    const wb = new ExcelJS.Workbook();
    wb.creator = "WEND'D Transport";
    wb.created = new Date();
    const ws = wb.addWorksheet('Archives');
    ws.columns = [
      { header: 'Code', key: 'code', width: 14 }, { header: 'Statut', key: 'status', width: 12 },
      { header: 'Type', key: 'tripType', width: 14 }, { header: 'Langue', key: 'language', width: 8 },
      { header: 'Départ', key: 'pickup', width: 22 }, { header: 'Arrivée', key: 'dropoff', width: 22 },
      { header: 'Pickup', key: 'pickupDateTime', width: 20 }, { header: 'Montant', key: 'amount', width: 12 },
      { header: 'ChauffeurId', key: 'driverId', width: 38 }, { header: 'ClientHash', key: 'clientHash', width: 66 },
      { header: 'Archivé le', key: 'archivedAt', width: 20 },
    ];

    const archivedAt = new Date();
    for (const r of rows) {
      ws.addRow({
        code: r.code, status: r.status, tripType: r.tripType, language: r.language,
        pickup: r.pickupCustomAddress || r.pickupZone?.name || '',
        dropoff: r.dropoffCustomAddress || r.dropoffZone?.name || '',
        pickupDateTime: new Date(r.pickupDateTime).toISOString(),
        amount: Number(r.amount), driverId: r.driverId || '',
        clientHash: this.hashClient(r.clientEmail) || '', archivedAt: archivedAt.toISOString(),
      });
    }

    ws.getRow(1).font = { bold: true };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

    const xlsxBuffer = Buffer.from(await wb.xlsx.writeBuffer());
    const filename = `archives-${opts.reason}-${new Date().toISOString().slice(0, 10)}.xlsx`;

    const archiveEntities = rows.map(r =>
      this.reservationArchiveRepository.create({
        code: r.code, status: r.status, tripType: r.tripType, language: r.language,
        pickupDateTime: r.pickupDateTime, completedAt: r.completedAt, amount: r.amount,
        driverId: r.driverId, pickupLabel: r.pickupCustomAddress || r.pickupZone?.name || null,
        dropoffLabel: r.dropoffCustomAddress || r.dropoffZone?.name || null,
        clientHash: this.hashClient(r.clientEmail),
      }),
    );
    await this.reservationArchiveRepository.save(archiveEntities);

    const admins = await this.usersService.findAdmins();
    const adminEmails = admins.map(a => a.email).filter(Boolean);
    await this.notificationsService.sendAdminArchiveReport(
      adminEmails,
      `Archivage ${opts.reason} — ${rows.length} réservations`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;"><h2>Archivage terminé</h2><p><strong>${rows.length}</strong> réservations ont été archivées et supprimées du dashboard.</p><p>Pièce jointe : <strong>${filename}</strong></p></body></html>`,
      filename, xlsxBuffer,
    );

    await this.reservationsRepository.delete(rows.map(r => r.id));
    return { archived: rows.length };
  }

  async updateReservation(id: string, updates: Partial<CreateReservationDto>): Promise<Reservation> {
    const reservation = await this.findById(id);
    const updateData: any = { ...updates };

    if (updates.pickupZoneId && updates.dropoffZoneId) {
      const tariff = await this.tariffsService.findByZones(updates.pickupZoneId, updates.dropoffZoneId);
      if (tariff) updateData.amount = tariff.price;
    }

    await this.reservationsRepository.update(id, updateData);

    await this.auditService.log({
      userId: null, action: 'UPDATE', entityType: 'Reservation', entityId: id,
      oldData: reservation, newData: updateData,
      description: `Reservation ${reservation.code} updated by admin`,
    });

    const updated = await this.findById(id);

    setImmediate(async () => {
      try {
        if (updated.driverId) await this.notificationsService.sendDriverRideModified(updated);
      } catch (e) {
        this.logger.error('Failed to send ride modified notification', JSON.stringify(e));
      }
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAYMENT SUPERVISION SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════

  async updatePaymentStatusByDriver(reservationId: string, paymentStatus: PaymentStatus, userId: string): Promise<Reservation> {
    const allowedStatuses = [PaymentStatus.IMPAYE, PaymentStatus.PAIEMENT_COMPLET, PaymentStatus.ACOMPTE_VERSE];
    if (!allowedStatuses.includes(paymentStatus)) {
      throw new BadRequestException(`Statut de paiement non autorisé. Valeurs possibles: ${allowedStatuses.join(', ')}`);
    }

    const reservation = await this.reservationsRepository.findOne({ where: { id: reservationId }, relations: ['driver', 'pickupZone', 'dropoffZone'] });
    if (!reservation) throw new NotFoundException('Réservation non trouvée');
    if (reservation.status !== ReservationStatus.TERMINEE) {
      throw new BadRequestException('Le statut de paiement ne peut être modifié que pour les courses terminées');
    }

    const driver = await this.driversService.findByUserId(userId);
    if (!driver || reservation.driverId !== driver.id) throw new ForbiddenException("Vous n'êtes pas assigné à cette course");

    const oldPaymentStatus = reservation.paymentStatus;
    await this.reservationsRepository.update(reservationId, { paymentStatus });

    await this.auditService.log({
      userId: driver.userId, action: 'UPDATE_PAYMENT_STATUS', entityType: 'Reservation', entityId: reservationId,
      oldData: { paymentStatus: oldPaymentStatus }, newData: { paymentStatus },
      description: `Chauffeur ${driver.firstName} ${driver.lastName} a changé le statut de paiement de ${oldPaymentStatus} à ${paymentStatus} pour la course ${reservation.code}`,
    });

    const updated = await this.findById(reservationId);

    if (paymentStatus === PaymentStatus.IMPAYE && oldPaymentStatus !== PaymentStatus.IMPAYE) {
      setImmediate(async () => {
        try { await this.notifyAdminUnpaidRide(updated); } catch (e) {
          this.logger.error('Failed to send unpaid ride notification', JSON.stringify(e));
        }
      });
    }

    return updated;
  }

  async getPaymentSupervision(filters: PaymentSupervisionFilters): Promise<{ reservations: Reservation[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const qb = this.reservationsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.driver', 'driver')
      .leftJoinAndSelect('r.pickupZone', 'pickupZone')
      .leftJoinAndSelect('r.dropoffZone', 'dropoffZone')
      .orderBy('r.pickupDateTime', 'DESC');

    if (filters.paymentStatus) qb.andWhere('r.paymentStatus = :paymentStatus', { paymentStatus: filters.paymentStatus });
    if (filters.dateFrom) qb.andWhere('r.pickupDateTime >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    if (filters.dateTo) qb.andWhere('r.pickupDateTime <= :dateTo', { dateTo: new Date(filters.dateTo) });

    const [reservations, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { reservations, total, page, limit };
  }

  async updatePaymentStatusByAdmin(reservationId: string, paymentStatus: PaymentStatus, admin: { id: string; email: string }): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({ where: { id: reservationId }, relations: ['driver', 'pickupZone', 'dropoffZone'] });
    if (!reservation) throw new NotFoundException('Réservation non trouvée');

    const oldPaymentStatus = reservation.paymentStatus;
    await this.reservationsRepository.update(reservationId, { paymentStatus });

    await this.auditService.log({
      userId: admin.id, action: 'ADMIN_UPDATE_PAYMENT_STATUS', entityType: 'Reservation', entityId: reservationId,
      oldData: { paymentStatus: oldPaymentStatus }, newData: { paymentStatus },
      description: `Admin ${admin.email} a changé le statut de paiement de ${oldPaymentStatus} à ${paymentStatus} pour la course ${reservation.code}`,
    });

    const updated = await this.findById(reservationId);

    if (paymentStatus === PaymentStatus.PAIEMENT_COMPLET && oldPaymentStatus === PaymentStatus.IMPAYE && updated.driver?.email) {
      setImmediate(async () => {
        try { await this.notificationsService.sendDriverPaymentRegularized(updated); } catch (e) {
          this.logger.error('Failed to send payment regularized notification', JSON.stringify(e));
        }
      });
    }

    if (paymentStatus === PaymentStatus.IMPAYE && oldPaymentStatus !== PaymentStatus.IMPAYE) {
      setImmediate(async () => {
        try { await this.notifyAdminUnpaidRide(updated); } catch (e) {
          this.logger.error('Failed to send unpaid ride notification', JSON.stringify(e));
        }
      });
    }

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CASCADE AUTO-ASSIGNMENT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════

  async createDriverProposals(reservationId: string): Promise<DriverProposal[]> {
    const reservation = await this.findById(reservationId);

    if (reservation.status !== ReservationStatus.EN_ATTENTE) {
      throw new BadRequestException('Only pending reservations can have proposals created');
    }

    const existingProposals = await this.driverProposalRepository.find({ where: { reservationId } });
    if (existingProposals.length > 0) {
      this.logger.warn(`Proposals already exist for reservation ${reservation.code}`);
      return existingProposals;
    }

    const availableDrivers = await this.driversService.findAvailable();
    if (availableDrivers.length === 0) {
      await this.notifyAdminNoDriversAvailable(reservation);
      throw new BadRequestException('No available drivers');
    }

    const pickupLat = Number(reservation.clientLatitude) || Number(reservation.pickupLatitude) || Number(reservation.pickupZone?.latitude);
    const pickupLng = Number(reservation.clientLongitude) || Number(reservation.pickupLongitude) || Number(reservation.pickupZone?.longitude);

    const driversWithDistance = await Promise.all(
      availableDrivers.map(async (driver) => {
        try {
          const location = await this.driverLocationRepository.findOne({ where: { driverId: driver.id }, order: { updatedAt: 'DESC' } });
          if (location) {
            const ageMs = Date.now() - new Date(location.updatedAt).getTime();
            if (ageMs < 30 * 60 * 1000) {
              const distance = this.calculateDistance(pickupLat || 0, pickupLng || 0, Number(location.latitude), Number(location.longitude));
              return { driver, distance };
            }
          }
          const lastRide = await this.reservationsRepository.findOne({ where: { driverId: driver.id, status: ReservationStatus.TERMINEE }, order: { completedAt: 'DESC' } });
          if (lastRide) {
            const dropLat = Number(lastRide.dropoffLatitude) || Number(lastRide.dropoffZone?.latitude);
            const dropLng = Number(lastRide.dropoffLongitude) || Number(lastRide.dropoffZone?.longitude);
            if (dropLat && dropLng && pickupLat && pickupLng) {
              const distance = this.calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
              return { driver, distance };
            }
          }
          return { driver, distance: Infinity };
        } catch { return { driver, distance: Infinity }; }
      }),
    );

    driversWithDistance.sort((a, b) => a.distance - b.distance);

    const proposals: DriverProposal[] = [];
    for (let i = 0; i < driversWithDistance.length; i++) {
      const { driver, distance } = driversWithDistance[i];
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      const proposal = this.driverProposalRepository.create({
        reservationId, driverId: driver.id, status: ProposalStatus.PENDING,
        token: this.generateProposalToken(), position: i + 1,
        distance: distance === Infinity ? 999999 : distance, expiresAt,
      });
      proposals.push(await this.driverProposalRepository.save(proposal));
    }

    this.logger.log(`Created ${proposals.length} proposals for reservation ${reservation.code}, closest: ${proposals[0]?.distance?.toFixed(2)}km`);

    if (proposals.length > 0) await this.sendNextProposal(reservationId);

    return proposals;
  }

  async sendNextProposal(reservationId: string): Promise<void> {
    const reservation = await this.findById(reservationId);

    const nextProposal = await this.driverProposalRepository.findOne({
      where: { reservationId, status: ProposalStatus.PENDING },
      order: { position: 'ASC' },
      relations: ['driver', 'reservation'],
    });

    if (!nextProposal) {
      this.logger.warn(`No pending proposals for reservation ${reservation.code}`);
      await this.notifyAdminAllDriversDeclined(reservation);
      return;
    }

    if (reservation.status !== ReservationStatus.EN_ATTENTE) {
      this.logger.log(`Reservation ${reservation.code} no longer pending, skipping proposal`);
      return;
    }

    const driver = await this.driversService.findById(nextProposal.driverId);
    if (driver.status !== DriverStatus.DISPONIBLE) {
      this.logger.log(`Driver ${driver.firstName} no longer available, skipping`);
      await this.driverProposalRepository.update(nextProposal.id, { status: ProposalStatus.SKIPPED });
      return this.sendNextProposal(reservationId);
    }

    await this.notificationsService.sendDriverProposal(nextProposal, reservation);
    this.logger.log(`Sent proposal to driver ${driver.firstName} ${driver.lastName} for reservation ${reservation.code} (position ${nextProposal.position})`);
  }

  async acceptProposal(token: string): Promise<Reservation> {
    const proposal = await this.driverProposalRepository.findOne({ where: { token }, relations: ['reservation', 'driver'] });

    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.status !== ProposalStatus.PENDING) throw new BadRequestException(`Proposal already ${proposal.status.toLowerCase()}`);
    if (proposal.expiresAt < new Date()) {
      await this.driverProposalRepository.update(proposal.id, { status: ProposalStatus.EXPIRED });
      throw new BadRequestException('Proposal has expired');
    }

    const freshReservation = await this.findById(proposal.reservation.id);
    if (freshReservation.status !== ReservationStatus.EN_ATTENTE) throw new BadRequestException('Reservation no longer pending');

    await this.assignDriver(proposal.reservation.id, proposal.driverId);
    await this.driverProposalRepository.update(proposal.id, { status: ProposalStatus.ACCEPTED, respondedAt: new Date() });

    const otherProposals = await this.driverProposalRepository.find({ where: { reservationId: proposal.reservation.id, status: ProposalStatus.PENDING }, relations: ['driver'] });
    for (const other of otherProposals) {
      if (other.id !== proposal.id) {
        await this.driverProposalRepository.update(other.id, { status: ProposalStatus.SKIPPED });
        if (other.driver?.email) await this.notificationsService.sendDriverProposalTaken(other.driver, proposal.reservation);
      }
    }

    this.logger.log(`Driver ${proposal.driver.firstName} ${proposal.driver.lastName} accepted proposal for reservation ${proposal.reservation.code}`);
    return this.findById(proposal.reservation.id);
  }

  async declineProposal(token: string): Promise<void> {
    const proposal = await this.driverProposalRepository.findOne({ where: { token }, relations: ['reservation', 'driver'] });

    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.status !== ProposalStatus.PENDING) throw new BadRequestException(`Proposal already ${proposal.status.toLowerCase()}`);
    if (proposal.expiresAt < new Date()) {
      await this.driverProposalRepository.update(proposal.id, { status: ProposalStatus.EXPIRED });
      throw new BadRequestException('Proposal has expired');
    }

    await this.driverProposalRepository.update(proposal.id, { status: ProposalStatus.DECLINED, respondedAt: new Date() });
    this.logger.log(`Driver ${proposal.driver.firstName} ${proposal.driver.lastName} declined proposal for reservation ${proposal.reservation.code}`);
    await this.sendNextProposal(proposal.reservationId);
  }

  async processExpiredProposals(): Promise<void> {
    const now = new Date();
    const expiredProposals = await this.driverProposalRepository.find({ where: { status: ProposalStatus.PENDING, expiresAt: LessThan(now) }, relations: ['reservation'] });

    this.logger.log(`Found ${expiredProposals.length} expired proposals to process`);

    for (const proposal of expiredProposals) {
      await this.driverProposalRepository.update(proposal.id, { status: ProposalStatus.EXPIRED });
      this.logger.log(`Proposal ${proposal.id} for reservation ${proposal.reservation.code} expired`);
      await this.sendNextProposal(proposal.reservationId);
    }
  }

  private generateProposalToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
    return token;
  }

  private async notifyAdminNoDriversAvailable(reservation: Reservation): Promise<void> {
    try {
      const admins = await this.usersService.findAdmins();
      await this.notificationsService.sendAdminNoDriversAvailable(reservation, admins.map(a => a.email));
    } catch (e) { this.logger.error('Failed to send admin notification', JSON.stringify(e)); }
  }

  private async notifyAdminAllDriversDeclined(reservation: Reservation): Promise<void> {
    try {
      const admins = await this.usersService.findAdmins();
      await this.notificationsService.sendAdminAllDriversDeclined(reservation, admins.map(a => a.email));
    } catch (e) { this.logger.error('Failed to send admin notification', JSON.stringify(e)); }
  }

  private async notifyAdminUnpaidRide(reservation: Reservation): Promise<void> {
    try {
      const admins = await this.usersService.findAdmins();
      await this.notificationsService.sendAdminUnpaidRide(reservation, admins.map(a => a.email), new Date());
    } catch (e) { this.logger.error('Failed to send unpaid ride admin notification', JSON.stringify(e)); }
  }
}
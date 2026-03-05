import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { DriversService } from '../drivers/drivers.service';
import { EmailLog } from '../notifications/entities/email-log.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { DriverStatus } from '../../common/enums/driver-status.enum';
import { IsEmail, IsString, IsNotEmpty, MinLength, Matches, IsOptional } from 'class-validator';

class CreateDriverUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Invalid international phone format' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private usersService: UsersService,
    private driversService: DriversService,
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
  ) {}

  @Get('stats')
  async getStats() {
    const total = await this.reservationRepository.count();
    const byStatus = await this.reservationRepository
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.status')
      .getRawMany();

    const revenue = await this.reservationRepository
      .createQueryBuilder('r')
      .select('SUM(r.amount)', 'total')
      .where('r.status = :status', { status: ReservationStatus.TERMINEE })
      .getRawOne();

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyCount = await this.reservationRepository
      .createQueryBuilder('r')
      .where('r.createdAt >= :start', { start: thisMonth })
      .andWhere('r.status != :cancelled', { cancelled: ReservationStatus.ANNULEE })
      .getCount();

    const monthlyRevenue = await this.reservationRepository
      .createQueryBuilder('r')
      .select('SUM(r.amount)', 'total')
      .where('r.status = :status', { status: ReservationStatus.TERMINEE })
      .andWhere('r.completedAt >= :start', { start: thisMonth })
      .getRawOne();

    const driverStats = await this.driversService.findAll();
    const driversByStatus = {
      [DriverStatus.DISPONIBLE]: driverStats.filter(d => d.status === DriverStatus.DISPONIBLE && d.isActive).length,
      [DriverStatus.EN_COURSE]: driverStats.filter(d => d.status === DriverStatus.EN_COURSE).length,
      [DriverStatus.HORS_LIGNE]: driverStats.filter(d => d.status === DriverStatus.HORS_LIGNE).length,
      total: driverStats.length,
      actifs: driverStats.filter(d => d.isActive).length,
    };

    // Récupérer les courses actives pour chaque chauffeur
    const activeReservations = await this.reservationRepository.find({
      where: [
        { status: ReservationStatus.ASSIGNEE },
        { status: ReservationStatus.EN_COURS },
      ],
      relations: ['driver', 'pickupZone', 'dropoffZone'],
    });

    const driversWithCourses = driverStats
      .filter(d => d.isActive)
      .map(driver => {
        const activeCourse = activeReservations.find(r => r.driverId === driver.id);
        return {
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          status: driver.status,
          vehicleType: driver.vehicleType,
          vehiclePlate: driver.vehiclePlate,
          activeCourse: activeCourse ? {
            code: activeCourse.code,
            status: activeCourse.status,
            pickupZone: activeCourse.pickupZone?.name,
            dropoffZone: activeCourse.dropoffZone?.name,
          } : null,
        };
      });

    const failedEmails = await this.emailLogRepository.count({ where: { status: 'ECHEC' } });

    // Préparer activeDrivers pour la carte globale
    const activeDrivers = driverStats
      .filter(d => d.isActive && (d.status === 'DISPONIBLE' || d.status === 'EN_COURSE'))
      .map(driver => {
        const activeCourse = activeReservations.find(r => r.driverId === driver.id);
        return {
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phone: driver.phone,
          vehicleType: driver.vehicleType,
          vehiclePlate: driver.vehiclePlate,
          status: driver.status,
          currentRide: activeCourse ? {
            code: activeCourse.code,
            clientName: `${activeCourse.clientFirstName} ${activeCourse.clientLastName}`,
            pickup: activeCourse.pickupCustomAddress || activeCourse.pickupZone?.name || 'Adresse personnalisée',
            dropoff: activeCourse.dropoffCustomAddress || activeCourse.dropoffZone?.name || 'Adresse personnalisée',
            amount: activeCourse.amount,
          } : undefined,
        };
      });

    return {
      total,
      byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count) }), {}),
      revenue: {
        total: parseFloat(revenue?.total || '0'),
        thisMonth: parseFloat(monthlyRevenue?.total || '0'),
      },
      thisMonth: monthlyCount,
      drivers: driversByStatus,
      driversDetails: driversWithCourses,
      activeDrivers,
      alerts: {
        failedEmails,
      },
    };
  }

  @Get('email-logs')
  async getEmailLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('status') status?: string,
  ) {
    const qb = this.emailLogRepository
      .createQueryBuilder('log')
      .orderBy('log.sentAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.where('log.status = :status', { status });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  @Get('users')
  getUsers(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.usersService.findAll(page, limit);
  }

  @Post('users/driver')
  async createDriverUser(@Body() dto: CreateDriverUserDto) {
    const user = await this.usersService.create(
      dto.email,
      dto.password,
      Role.DRIVER,
      dto.firstName,
      dto.lastName,
    );
    const driver = await this.driversService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      vehicleType: dto.vehicleType,
      vehiclePlate: dto.vehiclePlate,
      email: dto.email,
      userId: user.id,
    });
    return { user, driver };
  }

  @Post('users/:id/deactivate')
  deactivateUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string },
  ) {
    if (id === currentUser.id) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    return this.usersService.deactivate(id);
  }

  @Put('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Get('clients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getClients(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const reservations = await this.reservationRepository.find({
      order: { createdAt: 'DESC' },
    });

    const clientsMap = new Map<string, any>();

    reservations.forEach(res => {
      const key = res.clientEmail;
      if (!clientsMap.has(key)) {
        clientsMap.set(key, {
          email: res.clientEmail,
          firstName: res.clientFirstName,
          lastName: res.clientLastName,
          phone: res.clientPhone,
          totalRides: 0,
          completedRides: 0,
          cancelledRides: 0,
          totalSpent: 0,
          lastRide: res.createdAt,
        });
      }

      const client = clientsMap.get(key);
      client.totalRides++;
      if (res.status === ReservationStatus.TERMINEE) {
        client.completedRides++;
        client.totalSpent += Number(res.amount);
      }
      if (res.status === ReservationStatus.ANNULEE) {
        client.cancelledRides++;
      }
      if (new Date(res.createdAt) > new Date(client.lastRide)) {
        client.lastRide = res.createdAt;
      }
    });

    const clients = Array.from(clientsMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;

    return {
      data: clients.slice(start, end),
      total: clients.length,
    };
  }

  @Get('clients/:email/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getClientHistory(@Param('email') email: string) {
    const reservations = await this.reservationRepository.find({
      where: { clientEmail: email },
      relations: ['pickupZone', 'dropoffZone', 'driver'],
      order: { createdAt: 'DESC' },
    });

    const totalSpent = reservations
      .filter(r => r.status === ReservationStatus.TERMINEE)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      client: reservations.length > 0 ? {
        email: reservations[0].clientEmail,
        firstName: reservations[0].clientFirstName,
        lastName: reservations[0].clientLastName,
        phone: reservations[0].clientPhone,
      } : null,
      stats: {
        totalRides: reservations.length,
        completedRides: reservations.filter(r => r.status === ReservationStatus.TERMINEE).length,
        cancelledRides: reservations.filter(r => r.status === ReservationStatus.ANNULEE).length,
        totalSpent,
      },
      reservations,
    };
  }

  @Get('financial-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getFinancialStats() {
    const allReservations = await this.reservationRepository.find({
      relations: ['driver'],
      order: { createdAt: 'ASC' },
    });

    const completedReservations = allReservations.filter(r => r.status === ReservationStatus.TERMINEE);
    
    // Revenus par jour (30 derniers jours)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const dailyRevenue = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRevenue = completedReservations
        .filter(r => new Date(r.createdAt).toISOString().split('T')[0] === dateStr)
        .reduce((sum, r) => sum + Number(r.amount), 0);
      
      dailyRevenue.push({ date: dateStr, revenue: dayRevenue });
    }

    // Revenus par mois (12 derniers mois)
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthRev = completedReservations
        .filter(r => {
          const rDate = new Date(r.createdAt);
          return rDate.getFullYear() === date.getFullYear() && rDate.getMonth() === date.getMonth();
        })
        .reduce((sum, r) => sum + Number(r.amount), 0);
      
      monthlyRevenue.push({ month: monthStr, revenue: monthRev });
    }

    // Top chauffeurs par revenu
    const driverRevenue = new Map<string, { name: string; revenue: number }>();
    completedReservations.forEach(r => {
      if (r.driver) {
        const key = r.driver.id;
        if (!driverRevenue.has(key)) {
          driverRevenue.set(key, {
            name: `${r.driver.firstName} ${r.driver.lastName}`,
            revenue: 0,
          });
        }
        driverRevenue.get(key)!.revenue += Number(r.amount);
      }
    });

    const topDrivers = Array.from(driverRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Statistiques de paiement
    const paymentStats = {
      completed: completedReservations.filter(r => r.paymentStatus === 'PAIEMENT_COMPLET').length,
      pending: completedReservations.filter(r => r.paymentStatus === 'EN_ATTENTE').length,
      totalCompleted: completedReservations
        .filter(r => r.paymentStatus === 'PAIEMENT_COMPLET')
        .reduce((sum, r) => sum + Number(r.amount), 0),
      totalPending: completedReservations
        .filter(r => r.paymentStatus === 'EN_ATTENTE')
        .reduce((sum, r) => sum + Number(r.amount), 0),
    };

    return {
      dailyRevenue,
      monthlyRevenue,
      topDrivers,
      paymentStats,
      totalRevenue: completedReservations.reduce((sum, r) => sum + Number(r.amount), 0),
      totalRides: completedReservations.length,
      averageRideValue: completedReservations.length > 0 
        ? completedReservations.reduce((sum, r) => sum + Number(r.amount), 0) / completedReservations.length 
        : 0,
    };
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAnalytics() {
    const reservations = await this.reservationRepository.find({
      relations: ['pickupZone', 'dropoffZone'],
    });

    // Zones les plus populaires (départ)
    const pickupZoneCount = new Map<string, { name: string; count: number; revenue: number }>();
    reservations.forEach(r => {
      if (r.pickupZone) {
        const key = r.pickupZone.id;
        if (!pickupZoneCount.has(key)) {
          pickupZoneCount.set(key, { name: r.pickupZone.name, count: 0, revenue: 0 });
        }
        const zone = pickupZoneCount.get(key)!;
        zone.count++;
        if (r.status === ReservationStatus.TERMINEE) {
          zone.revenue += Number(r.amount);
        }
      }
    });

    const topPickupZones = Array.from(pickupZoneCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Zones les plus populaires (arrivée)
    const dropoffZoneCount = new Map<string, { name: string; count: number; revenue: number }>();
    reservations.forEach(r => {
      if (r.dropoffZone) {
        const key = r.dropoffZone.id;
        if (!dropoffZoneCount.has(key)) {
          dropoffZoneCount.set(key, { name: r.dropoffZone.name, count: 0, revenue: 0 });
        }
        const zone = dropoffZoneCount.get(key)!;
        zone.count++;
        if (r.status === ReservationStatus.TERMINEE) {
          zone.revenue += Number(r.amount);
        }
      }
    });

    const topDropoffZones = Array.from(dropoffZoneCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Heures de pointe
    const hourlyDistribution = new Array(24).fill(0);
    reservations.forEach(r => {
      const hour = new Date(r.pickupDateTime).getHours();
      hourlyDistribution[hour]++;
    });

    const peakHours = hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Distribution par jour de la semaine
    const weekdayDistribution = new Array(7).fill(0);
    const weekdayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    reservations.forEach(r => {
      const day = new Date(r.pickupDateTime).getDay();
      weekdayDistribution[day]++;
    });

    const weekdayStats = weekdayDistribution.map((count, idx) => ({
      day: weekdayNames[idx],
      count,
    }));

    // Taux de conversion par statut
    const statusDistribution = {
      total: reservations.length,
      completed: reservations.filter(r => r.status === ReservationStatus.TERMINEE).length,
      cancelled: reservations.filter(r => r.status === ReservationStatus.ANNULEE).length,
      pending: reservations.filter(r => r.status === ReservationStatus.EN_ATTENTE).length,
      assigned: reservations.filter(r => r.status === ReservationStatus.ASSIGNEE).length,
      inProgress: reservations.filter(r => r.status === ReservationStatus.EN_COURS).length,
    };

    return {
      topPickupZones,
      topDropoffZones,
      peakHours,
      hourlyDistribution,
      weekdayStats,
      statusDistribution,
    };
  }
}

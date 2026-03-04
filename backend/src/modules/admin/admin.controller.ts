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

    const failedEmails = await this.emailLogRepository.count({ where: { status: 'ECHEC' } });

    return {
      total,
      byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count) }), {}),
      revenue: {
        total: parseFloat(revenue?.total || '0'),
        thisMonth: parseFloat(monthlyRevenue?.total || '0'),
      },
      thisMonth: monthlyCount,
      drivers: driversByStatus,
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
}

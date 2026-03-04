import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { DriversService } from '../drivers/drivers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('reservations')
export class ReservationsController {
  constructor(
    private reservationsService: ReservationsService,
    private driversService: DriversService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  create(@Body() dto: CreateReservationDto) {
    return this.reservationsService.create(dto);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.reservationsService.findByCode(code);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancelByToken(@Body() dto: CancelReservationDto) {
    return this.reservationsService.cancelByToken(dto.code, dto.token);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reservationsService.findAll({ page, limit, status: status as any, driverId, dateFrom, dateTo });
  }

  @Get('driver/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  async findMyRides(@CurrentUser() user: { id: string }) {
    const driver = await this.driversService.findByUserId(user.id);
    if (!driver) return [];
    return this.reservationsService.findByDriver(driver.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DRIVER)
  findOne(@Param('id') id: string) {
    return this.reservationsService.findById(id);
  }

  @Put(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  assignDriver(@Param('id') id: string, @Body() dto: AssignDriverDto) {
    return this.reservationsService.assignDriver(id, dto.driverId);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DRIVER)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservationsService.updateStatus(id, dto);
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  cancelByAdmin(@Param('id') id: string) {
    return this.reservationsService.cancelByAdmin(id);
  }
}

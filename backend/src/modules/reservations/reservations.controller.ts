import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reservationsService.findAll({ 
      page: page ? parseInt(page, 10) : undefined, 
      limit: limit ? parseInt(limit, 10) : undefined, 
      status: status as any, 
      driverId, 
      dateFrom, 
      dateTo 
    });
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

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateReservation(@Param('id') id: string, @Body() dto: Partial<CreateReservationDto>) {
    return this.reservationsService.updateReservation(id, dto);
  }

  @Get('export/csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async exportCsv(
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.reservationsService.exportToCsv({
      status: status as any,
      driverId,
      dateFrom,
      dateTo,
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="reservations-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  }

  @Delete('archive/completed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  archiveCompleted(@Query('olderThanDays') olderThanDays?: string) {
    const days = olderThanDays ? parseInt(olderThanDays, 10) : 90;
    return this.reservationsService.archiveCompleted(days);
  }
}

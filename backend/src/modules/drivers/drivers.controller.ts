import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { DriverStatus } from '../../common/enums/driver-status.enum';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.driversService.findAll();
  }

  @Get('available')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAvailable() {
    return this.driversService.findAvailable();
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  getMyProfile(@CurrentUser() user: { id: string }) {
    return this.driversService.findByUserId(user.id);
  }

  @Put('me')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  async updateMyProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: Partial<CreateDriverDto>,
  ) {
    const driver = await this.driversService.findByUserId(user.id);
    if (!driver) throw new NotFoundException('Driver profile not found for this account');
    return this.driversService.update(driver.id, dto);
  }

  @Put('me/status')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  async updateMyStatus(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateDriverStatusDto,
  ) {
    const driver = await this.driversService.findByUserId(user.id);
    if (!driver) throw new NotFoundException('Driver profile not found for this account');
    return this.driversService.updateStatus(driver.id, dto.status);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateDriverDto>) {
    return this.driversService.update(id, dto);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DRIVER)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateDriverStatusDto) {
    return this.driversService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.driversService.deactivate(id);
  }
}

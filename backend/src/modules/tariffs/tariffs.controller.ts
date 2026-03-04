import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { TariffsService } from './tariffs.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('tariffs')
export class TariffsController {
  constructor(private tariffsService: TariffsService) {}

  @Get('price')
  async findByZones(@Query('from') from: string, @Query('to') to: string) {
    if (!from || !to) {
      throw new BadRequestException('Query params "from" and "to" (zone UUIDs) are required');
    }
    const tariff = await this.tariffsService.findByZones(from, to);
    if (!tariff) throw new NotFoundException('No active tariff found for this zone pair');
    return tariff;
  }

  @Get('active')
  findActive() {
    return this.tariffsService.findActive();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.tariffsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTariffDto) {
    return this.tariffsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateTariffDto>) {
    return this.tariffsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.tariffsService.remove(id);
  }
}

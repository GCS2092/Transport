import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { BulkDeactivateZonesDto } from './dto/bulk-deactivate-zones.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('zones')
export class ZonesController {
  constructor(private zonesService: ZonesService) {}

  @Get('active')
  findActive() {
    return this.zonesService.findActive();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.zonesService.findAll();
  }

  @Post('bulk-deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  bulkDeactivate(@Body() dto: BulkDeactivateZonesDto) {
    return this.zonesService.bulkDeactivate(dto.zoneIds);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateZoneDto) {
    return this.zonesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateZoneDto>) {
    return this.zonesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }

  // Géocode automatiquement toutes les zones sans coordonnées GPS
  // L'admin n'a pas besoin de connaître les coordonnées — juste le nom de la zone suffit
  // Nominatim (OpenStreetMap) trouve les coordonnées à partir du nom
  @Post('geocode-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  geocodeAll() {
    return this.zonesService.geocodeAllMissingCoords();
  }
}
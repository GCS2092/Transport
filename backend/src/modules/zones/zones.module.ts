import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zone } from './entities/zone.entity';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { TariffsModule } from '../tariffs/tariffs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Zone]), TariffsModule],
  controllers: [ZonesController],
  providers: [ZonesService],
  exports: [ZonesService],
})
export class ZonesModule {}

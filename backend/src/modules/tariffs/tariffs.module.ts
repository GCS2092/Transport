import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from './entities/tariff.entity';
import { TariffsService } from './tariffs.service';
import { TariffsController } from './tariffs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tariff])],
  controllers: [TariffsController],
  providers: [TariffsService],
  exports: [TariffsService],
})
export class TariffsModule {}

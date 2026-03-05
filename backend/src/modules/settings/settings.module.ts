import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { Setting } from './entities/setting.entity';
import { Contact } from './entities/contact.entity';
import { Faq } from './entities/faq.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Setting, Contact, Faq])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailLog } from './entities/email-log.entity';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailLog])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { ZonesModule } from './modules/zones/zones.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { UsersService } from './modules/users/users.service';

@Module({
  controllers: [AppController],
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    DriversModule,
    ZonesModule,
    TariffsModule,
    ReservationsModule,
    NotificationsModule,
    PdfModule,
    SchedulerModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private usersService: UsersService) {}

  async onModuleInit() {
    await this.usersService.ensureAdminExists();
  }
}

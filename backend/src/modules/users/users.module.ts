import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => DriversModule),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
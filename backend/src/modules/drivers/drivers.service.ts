import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { DriverStatus } from '../../common/enums/driver-status.enum';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
  ) {}

  async findAll(): Promise<Driver[]> {
    return this.driversRepository.find({ order: { lastName: 'ASC' } });
  }

  async findActive(): Promise<Driver[]> {
    return this.driversRepository.find({ where: { isActive: true }, order: { lastName: 'ASC' } });
  }

  async findAvailable(): Promise<Driver[]> {
    return this.driversRepository.find({
      where: { isActive: true, status: DriverStatus.DISPONIBLE },
      order: { lastName: 'ASC' },
    });
  }

  async findById(id: string): Promise<Driver> {
    const driver = await this.driversRepository.findOne({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async findByUserId(userId: string): Promise<Driver | null> {
    return this.driversRepository.findOne({ where: { userId } });
  }

  async create(dto: CreateDriverDto): Promise<Driver> {
    const driver = this.driversRepository.create(dto);
    return this.driversRepository.save(driver);
  }

  async update(id: string, dto: Partial<CreateDriverDto>): Promise<Driver> {
    await this.findById(id);
    await this.driversRepository.update(id, dto);
    return this.findById(id);
  }

  async updateStatus(id: string, status: DriverStatus): Promise<Driver> {
    await this.findById(id);
    await this.driversRepository.update(id, { status });
    return this.findById(id);
  }

  async deactivate(id: string): Promise<void> {
    await this.findById(id);
    await this.driversRepository.update(id, { isActive: false });
  }
}

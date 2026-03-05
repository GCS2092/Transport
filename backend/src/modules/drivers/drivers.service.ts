import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { DriverLocation } from './entities/driver-location.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { DriverStatus } from '../../common/enums/driver-status.enum';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
    @InjectRepository(DriverLocation)
    private locationRepository: Repository<DriverLocation>,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
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

  async getDriverStats(id: string) {
    const driver = await this.findById(id);
    
    const reservations = await this.reservationsRepository.find({
      where: { driverId: id },
      relations: ['pickupZone', 'dropoffZone'],
    });

    const totalRides = reservations.length;
    const completedRides = reservations.filter(r => r.status === ReservationStatus.TERMINEE).length;
    const cancelledRides = reservations.filter(r => r.status === ReservationStatus.ANNULEE).length;
    const totalRevenue = reservations
      .filter(r => r.status === ReservationStatus.TERMINEE)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayRides = reservations.filter(r => new Date(r.createdAt) >= today);
    const monthRides = reservations.filter(r => new Date(r.createdAt) >= thisMonth);

    const todayRevenue = todayRides
      .filter(r => r.status === ReservationStatus.TERMINEE)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const monthRevenue = monthRides
      .filter(r => r.status === ReservationStatus.TERMINEE)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      driver,
      stats: {
        totalRides,
        completedRides,
        cancelledRides,
        totalRevenue,
        todayRides: todayRides.length,
        todayRevenue,
        monthRides: monthRides.length,
        monthRevenue,
        averageRideValue: completedRides > 0 ? totalRevenue / completedRides : 0,
        completionRate: totalRides > 0 ? (completedRides / totalRides) * 100 : 0,
      },
      recentRides: reservations.slice(0, 10),
    };
  }

  async updateLocation(driverId: string, dto: UpdateLocationDto): Promise<DriverLocation> {
    await this.findById(driverId);
    
    // Chercher la dernière localisation
    let location = await this.locationRepository.findOne({
      where: { driverId },
      order: { updatedAt: 'DESC' },
    });

    if (location) {
      // Mettre à jour la localisation existante
      await this.locationRepository.update(location.id, dto);
      return this.locationRepository.findOne({ where: { id: location.id } });
    } else {
      // Créer une nouvelle localisation
      location = this.locationRepository.create({
        driverId,
        ...dto,
      });
      return this.locationRepository.save(location);
    }
  }

  async getLocation(driverId: string): Promise<DriverLocation | null> {
    return this.locationRepository.findOne({
      where: { driverId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getLocationByReservation(reservationId: string): Promise<DriverLocation | null> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId },
      relations: ['driver'],
    });

    if (!reservation || !reservation.driverId) {
      return null;
    }

    return this.getLocation(reservation.driverId);
  }
}

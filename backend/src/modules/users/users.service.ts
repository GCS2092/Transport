import { Injectable, ConflictException, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { DriversService } from '../drivers/drivers.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(forwardRef(() => DriversService))
    private driversService: DriversService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(email: string, password: string, role: Role, firstName?: string, lastName?: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await argon2.hash(password);
    const user = this.usersRepository.create({ email, password: hashed, role, firstName, lastName });
    return this.usersRepository.save(user);
  }

  async ensureAdminExists(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) return;

    const existing = await this.findByEmail(adminEmail);
    if (!existing) {
      await this.create(adminEmail, adminPassword, Role.ADMIN, 'Admin', 'VTC');
    }
  }

  async findAll(page = 1, limit = 50): Promise<{ data: Partial<User>[]; total: number }> {
    const [data, total] = await this.usersRepository.findAndCount({
      select: ['id', 'email', 'role', 'firstName', 'lastName', 'isActive', 'createdAt'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findAdmins(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: Role.ADMIN, isActive: true },
      select: ['id', 'email', 'firstName', 'lastName'],
    });
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepository.update(id, { isActive: false });
  }

  async activate(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepository.update(id, { isActive: true });
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    // Supprimer le driver lié avant de supprimer le user
    if (user.role === Role.DRIVER) {
      const driver = await this.driversService.findByUserId(id);
      if (driver) {
        await this.driversService.deleteByDriverId(driver.id);
      }
    }

    await this.usersRepository.delete(id);
  }
}
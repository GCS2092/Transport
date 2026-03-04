import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './entities/zone.entity';
import { CreateZoneDto } from './dto/create-zone.dto';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone)
    private zonesRepository: Repository<Zone>,
  ) {}

  async findAll(): Promise<Zone[]> {
    return this.zonesRepository.find({ order: { name: 'ASC' } });
  }

  async findActive(): Promise<Zone[]> {
    return this.zonesRepository.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Zone> {
    const zone = await this.zonesRepository.findOne({ where: { id } });
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  async create(dto: CreateZoneDto): Promise<Zone> {
    const existing = await this.zonesRepository.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Zone name already exists');
    const zone = this.zonesRepository.create(dto);
    return this.zonesRepository.save(zone);
  }

  async update(id: string, dto: Partial<CreateZoneDto>): Promise<Zone> {
    await this.findById(id);
    await this.zonesRepository.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.zonesRepository.update(id, { isActive: false });
  }
}

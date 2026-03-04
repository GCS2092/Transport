import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tariff } from './entities/tariff.entity';
import { CreateTariffDto } from './dto/create-tariff.dto';

@Injectable()
export class TariffsService {
  constructor(
    @InjectRepository(Tariff)
    private tariffsRepository: Repository<Tariff>,
  ) {}

  async findAll(): Promise<Tariff[]> {
    return this.tariffsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findActive(): Promise<Tariff[]> {
    return this.tariffsRepository.find({ where: { isActive: true } });
  }

  async findById(id: string): Promise<Tariff> {
    const tariff = await this.tariffsRepository.findOne({ where: { id } });
    if (!tariff) throw new NotFoundException('Tariff not found');
    return tariff;
  }

  async findByZones(zoneFromId: string, zoneToId: string): Promise<Tariff | null> {
    return this.tariffsRepository.findOne({
      where: { zoneFromId, zoneToId, isActive: true },
    });
  }

  async create(dto: CreateTariffDto): Promise<Tariff> {
    const existing = await this.tariffsRepository.findOne({
      where: { zoneFromId: dto.zoneFromId, zoneToId: dto.zoneToId },
    });
    if (existing) throw new ConflictException('A tariff already exists for this zone pair');
    const tariff = this.tariffsRepository.create(dto);
    return this.tariffsRepository.save(tariff);
  }

  async update(id: string, dto: Partial<CreateTariffDto>): Promise<Tariff> {
    await this.findById(id);
    await this.tariffsRepository.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.tariffsRepository.update(id, { isActive: false });
  }
}

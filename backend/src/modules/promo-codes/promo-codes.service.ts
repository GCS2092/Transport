import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCode } from '../../common/entities/promo-code.entity';

export interface CreatePromoCodeDto {
  code: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  validFrom?: Date;
  validUntil?: Date;
}

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCode)
    private promoCodesRepository: Repository<PromoCode>,
  ) {}

  async findAll(): Promise<PromoCode[]> {
    return this.promoCodesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<PromoCode> {
    const promo = await this.promoCodesRepository.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Promo code not found');
    return promo;
  }

  async findByCode(code: string): Promise<PromoCode | null> {
    return this.promoCodesRepository.findOne({ where: { code: code.toUpperCase() } });
  }

  async create(dto: CreatePromoCodeDto): Promise<PromoCode> {
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new BadRequestException('Promo code already exists');
    }

    const promo = this.promoCodesRepository.create({
      ...dto,
      code: dto.code.toUpperCase(),
    });
    return this.promoCodesRepository.save(promo);
  }

  async update(id: string, dto: Partial<CreatePromoCodeDto>): Promise<PromoCode> {
    await this.findById(id);
    if (dto.code) {
      dto.code = dto.code.toUpperCase();
    }
    await this.promoCodesRepository.update(id, dto);
    return this.findById(id);
  }

  async toggleActive(id: string): Promise<PromoCode> {
    const promo = await this.findById(id);
    await this.promoCodesRepository.update(id, { isActive: !promo.isActive });
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.promoCodesRepository.delete(id);
  }

  async validateAndApply(code: string, amount: number): Promise<{ valid: boolean; discount: number; message?: string }> {
    const promo = await this.findByCode(code);
    
    if (!promo) {
      return { valid: false, discount: 0, message: 'Code promo invalide' };
    }

    if (!promo.isActive) {
      return { valid: false, discount: 0, message: 'Code promo inactif' };
    }

    const now = new Date();
    if (promo.validFrom && new Date(promo.validFrom) > now) {
      return { valid: false, discount: 0, message: 'Code promo pas encore valide' };
    }

    if (promo.validUntil && new Date(promo.validUntil) < now) {
      return { valid: false, discount: 0, message: 'Code promo expiré' };
    }

    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      return { valid: false, discount: 0, message: 'Limite d\'utilisation atteinte' };
    }

    if (promo.minAmount && amount < promo.minAmount) {
      return { valid: false, discount: 0, message: `Montant minimum requis: ${promo.minAmount}` };
    }

    let discount = 0;
    if (promo.type === 'PERCENTAGE') {
      discount = (amount * promo.value) / 100;
      if (promo.maxDiscount && discount > promo.maxDiscount) {
        discount = promo.maxDiscount;
      }
    } else {
      discount = promo.value;
    }

    return { valid: true, discount };
  }

  async incrementUsage(code: string): Promise<void> {
    const promo = await this.findByCode(code);
    if (promo) {
      await this.promoCodesRepository.update(promo.id, {
        usageCount: promo.usageCount + 1,
      });
    }
  }
}

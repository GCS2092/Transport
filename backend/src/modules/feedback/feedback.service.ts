import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformRating } from './entities/platform-rating.entity';
import { CreatePlatformRatingDto } from './dto/create-platform-rating.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(PlatformRating)
    private readonly ratingRepo: Repository<PlatformRating>,
  ) {}

  async create(dto: CreatePlatformRatingDto): Promise<{ id: string; ok: boolean }> {
    const row = this.ratingRepo.create({
      rating: dto.rating,
      comment: dto.comment?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
    });
    const saved = await this.ratingRepo.save(row);
    return { id: saved.id, ok: true };
  }

  //! Stats réservées admin (optionnel)
  async getSummary(): Promise<{ count: number; average: number }> {
    const raw = await this.ratingRepo
      .createQueryBuilder('p')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(AVG(p.rating), 0)', 'average')
      .getRawOne<{ count: string; average: string }>();
    return {
      count: parseInt(raw?.count || '0', 10),
      average: Math.round((parseFloat(raw?.average || '0') + Number.EPSILON) * 100) / 100,
    };
  }
}

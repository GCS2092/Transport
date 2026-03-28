import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformRating } from './entities/platform-rating.entity';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformRating])],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}

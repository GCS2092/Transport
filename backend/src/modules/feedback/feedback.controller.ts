import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FeedbackService } from './feedback.service';
import { CreatePlatformRatingDto } from './dto/create-platform-rating.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('rating')
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  submitRating(@Body() dto: CreatePlatformRatingDto) {
    return this.feedbackService.create(dto);
  }

  @Get('rating/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  ratingSummary() {
    return this.feedbackService.getSummary();
  }
}

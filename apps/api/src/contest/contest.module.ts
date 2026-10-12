import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TrainingModule } from '../training/training.module';
import { ContestController } from './contest.controller';
import { ContestService } from './contest.service';

@Module({
  imports: [IdentityModule, TrainingModule], // JwtAuthGuard + shared question/review builders
  controllers: [ContestController],
  providers: [ContestService],
})
export class ContestModule {}

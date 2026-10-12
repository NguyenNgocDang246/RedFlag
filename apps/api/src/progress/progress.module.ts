import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TrainingModule } from '../training/training.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [IdentityModule, TrainingModule], // JwtAuthGuard + signal names
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}

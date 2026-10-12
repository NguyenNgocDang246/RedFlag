import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [IdentityModule], // uses OptionalJwtGuard + JwtModule
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}

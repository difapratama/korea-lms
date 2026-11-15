import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AdminGuard } from "../auth/guards/admin.guard";

import { LearningService } from "./learning.service";
import { AdminLearningController } from "./admin-learning.controller";
import { PublicLearningController } from "./public-learning.controller";

@Module({
  imports: [AuthModule],
  controllers: [AdminLearningController, PublicLearningController],
  providers: [LearningService, AdminGuard],
  exports: [LearningService],
})
export class LearningModule {}
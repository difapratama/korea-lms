import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../auth/guards/admin.guard';

import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { AdminCoursesController } from './admin-courses.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    CoursesController,
    AdminCoursesController,
  ],
  providers: [
    CoursesService,
    AdminGuard,
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
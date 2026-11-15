import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { LearningService } from "./learning.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { CreateModuleDto, UpdateModuleDto } from "./dto/create-module.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CreateLessonDto, UpdateLessonDto } from "./dto/create-lesson.dto";

@ApiTags("Admin Learning")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminLearningController {
  constructor(private readonly learning: LearningService) {}

  // MODULE CRUD

  @Post("courses/:courseId/modules")
  createModule(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.learning.createModule(courseId, dto);
  }

  @Get("courses/:courseId/modules")
  listModules(@Param("courseId", ParseUUIDPipe) courseId: string) {
    return this.learning.listModulesAdmin(courseId);
  }

  @Patch("modules/:moduleId")
  updateModule(
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.learning.updateModule(moduleId, dto);
  }

  @Delete("modules/:moduleId")
  deleteModule(@Param("moduleId", ParseUUIDPipe) moduleId: string) {
    return this.learning.deleteModule(moduleId);
  }

  // LESSON CRUD

  @Post("modules/:moduleId/lessons")
  createLesson(
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.learning.createLesson(moduleId, dto);
  }

  @Get("modules/:moduleId/lessons")
  listLessons(@Param("moduleId", ParseUUIDPipe) moduleId: string) {
    return this.learning.listLessonsAdmin(moduleId);
  }

  @Get("lessons/:lessonId")
  getLesson(@Param("lessonId", ParseUUIDPipe) lessonId: string) {
    return this.learning.getLessonAdmin(lessonId);
  }

  @Patch("lessons/:lessonId")
  updateLesson(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.learning.updateLesson(lessonId, dto);
  }

  @Delete("lessons/:lessonId")
  deleteLesson(@Param("lessonId", ParseUUIDPipe) lessonId: string) {
    return this.learning.deleteLesson(lessonId);
  }
}

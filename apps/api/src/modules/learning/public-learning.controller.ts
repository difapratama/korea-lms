import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";

import { LearningService } from "./learning.service";

@Controller()
export class PublicLearningController {
  constructor(private readonly learning: LearningService) {}

  @Get("courses/:courseId/modules")
  getCurriculum(@Param("courseId", ParseUUIDPipe) courseId: string) {
    return this.learning.getPublicCurriculum(courseId);
  }

  @Get("lessons/:lessonId")
  getLesson(@Param("lessonId", ParseUUIDPipe) lessonId: string) {
    return this.learning.getPublicLesson(lessonId);
  }
}
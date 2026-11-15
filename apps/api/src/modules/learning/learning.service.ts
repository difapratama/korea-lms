import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

import {
  CreateModuleDto,
  UpdateModuleDto,
} from './dto/create-module.dto';

import {
  CreateLessonDto,
  UpdateLessonDto,
} from './dto/create-lesson.dto';

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course tidak ditemukan');
    }

    return course;
  }

  private async requireModule(moduleId: string) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Module tidak ditemukan');
    }

    return module;
  }

  private async requireLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson tidak ditemukan');
    }

    return lesson;
  }

  // ========================
  // ADMIN: MODULE
  // ========================

  async createModule(
    courseId: string,
    dto: CreateModuleDto,
  ) {
    await this.requireCourse(courseId);

    return this.prisma.courseModule.create({
      data: {
        title: dto.title.trim(),
        position: dto.position,
        courseId,
      },
    });
  }

  async listModulesAdmin(courseId: string) {
    await this.requireCourse(courseId);

    return this.prisma.courseModule.findMany({
      where: { courseId },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        lessons: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async updateModule(
    moduleId: string,
    dto: UpdateModuleDto,
  ) {
    await this.requireModule(moduleId);

    return this.prisma.courseModule.update({
      where: { id: moduleId },
      data: {
        title: dto.title?.trim(),
        position: dto.position,
      },
    });
  }

  async deleteModule(moduleId: string) {
    await this.requireModule(moduleId);

    // Hindari penghapusan tidak sengaja
    // terhadap seluruh lesson di dalam modul.
    const lessonCount = await this.prisma.lesson.count({
      where: { moduleId },
    });

    if (lessonCount > 0) {
      throw new BadRequestException(
        'Module masih memiliki lesson. Hapus atau pindahkan lesson terlebih dahulu.',
      );
    }

    await this.prisma.courseModule.delete({
      where: { id: moduleId },
    });

    return { message: 'Module berhasil dihapus' };
  }

  // ========================
  // ADMIN: LESSON
  // ========================

  async createLesson(
    moduleId: string,
    dto: CreateLessonDto,
  ) {
    await this.requireModule(moduleId);

    return this.prisma.lesson.create({
      data: {
        title: dto.title.trim(),
        type: dto.type,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        position: dto.position,
        isFree: dto.isFree,
        moduleId,
      },
    });
  }

  async listLessonsAdmin(moduleId: string) {
    await this.requireModule(moduleId);

    return this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async getLessonAdmin(lessonId: string) {
    return this.requireLesson(lessonId);
  }

  async updateLesson(
    lessonId: string,
    dto: UpdateLessonDto,
  ) {
    await this.requireLesson(lessonId);

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: dto.title?.trim(),
        type: dto.type,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        position: dto.position,
        isFree: dto.isFree,
      },
    });
  }

  async deleteLesson(lessonId: string) {
    await this.requireLesson(lessonId);

    // Lesson yang sudah memiliki progres siswa
    // tidak boleh dihapus sembarangan.
    const progressCount =
      await this.prisma.lessonProgress.count({
        where: { lessonId },
      });

    if (progressCount > 0) {
      throw new BadRequestException(
        'Lesson sudah memiliki progres siswa dan tidak boleh dihapus.',
      );
    }

    await this.prisma.lesson.delete({
      where: { id: lessonId },
    });

    return { message: 'Lesson berhasil dihapus' };
  }

  // ========================
  // PUBLIC: STUDENT
  // ========================

  async getPublicCurriculum(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
      },
    });

    if (!course) {
      throw new NotFoundException('Course tidak ditemukan');
    }

    return this.prisma.courseModule.findMany({
      where: { courseId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        position: true,
        lessons: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            type: true,
            position: true,
            isFree: true,
          },
        },
      },
    });
  }

  async getPublicLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        module: {
          course: {
            status: CourseStatus.PUBLISHED,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson tidak ditemukan');
    }

    // Akses premium akan kita buat
    // melalui EntitlementGuard nanti.
    if (!lesson.isFree) {
      throw new ForbiddenException(
        'Materi ini membutuhkan akses premium',
      );
    }

    return {
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      content: lesson.content,
      mediaUrl: lesson.mediaUrl,
      isFree: lesson.isFree,
    };
  }
}
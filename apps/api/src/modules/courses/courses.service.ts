import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  CourseStatus,
} from '../../generated/prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  // Course yang boleh dilihat siswa
  findPublished() {
    return this.prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnail: true,
      },
    });
  }

  async findPublishedById(id: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        status: CourseStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnail: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course tidak ditemukan');
    }

    return course;
  }

  // Semua course untuk dashboard admin
  findAllAdmin() {
    return this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { modules: true } },
      },
    });
  }

  async findOneAdmin(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course tidak ditemukan');
    }

    return course;
  }

  async create(dto: CreateCourseDto) {
    try {
      return await this.prisma.course.create({
        data: {
          title: dto.title.trim(),
          slug: dto.slug,
          description: dto.description,
          thumbnail: dto.thumbnail,
          status: dto.status ?? CourseStatus.DRAFT,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOneAdmin(id);

    try {
      return await this.prisma.course.update({
        where: { id },
        data: {
          ...dto,
          title: dto.title?.trim(),
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  // Soft delete: arsipkan tanpa menghapus data
  async remove(id: string) {
    await this.findOneAdmin(id);

    await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.ARCHIVED },
    });

    return { message: 'Course berhasil diarsipkan' };
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Slug course sudah digunakan',
      );
    }

    throw error;
  }
}
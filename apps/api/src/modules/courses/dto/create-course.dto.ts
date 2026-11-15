import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CourseStatus } from '../../../generated/prisma/client';

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(160)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl({ require_tld: true })
  thumbnail?: string;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}

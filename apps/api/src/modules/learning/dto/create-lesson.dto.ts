import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { LessonType } from '../../../generated/prisma/client';

export class CreateLessonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @IsEnum(LessonType)
  type!: LessonType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
    require_tld: false,
  })
  mediaUrl?: string;

  @IsInt()
  @Min(0)
  position!: number;

  @IsBoolean()
  isFree!: boolean;
}

export class UpdateLessonDto extends PartialType(
  CreateLessonDto,
) {}
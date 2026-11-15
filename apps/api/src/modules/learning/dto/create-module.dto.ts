import {
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateModuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @IsInt()
  @Min(0)
  position!: number;
}

export class UpdateModuleDto extends PartialType(
  CreateModuleDto,
) {}
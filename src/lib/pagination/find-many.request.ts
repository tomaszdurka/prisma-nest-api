import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class FindManyRequest<T = any, C = any> {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  where?: T;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination?: PaginationDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  cursor?: C;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  orderBy?: Record<string, 'asc' | 'desc'>;
}

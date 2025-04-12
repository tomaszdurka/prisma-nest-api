import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { BaseFilter } from './base.filter';

export class BooleanFilter extends BaseFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  override equals?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  override not?: boolean;
}

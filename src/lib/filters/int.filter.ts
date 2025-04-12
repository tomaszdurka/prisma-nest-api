import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';
import { BaseFilter } from './base.filter';

export class IntFilter extends BaseFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  override equals?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  override not?: number;

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  override in?: number[];

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  override notIn?: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  lt?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  lte?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  gt?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  gte?: number;
}

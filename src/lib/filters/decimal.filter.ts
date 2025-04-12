import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { BaseFilter } from './base.filter';

export class DecimalFilter extends BaseFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  override equals?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  override not?: number;

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  override in?: number[];

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  override notIn?: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  lt?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  lte?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  gt?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  gte?: number;
}

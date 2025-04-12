import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseFilter } from './base.filter';

export class DateFilter extends BaseFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  override equals?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  override not?: Date;

  @ApiProperty({ required: false, type: [Date] })
  @IsOptional()
  @Type(() => Date)
  override in?: Date[];

  @ApiProperty({ required: false, type: [Date] })
  @IsOptional()
  @Type(() => Date)
  override notIn?: Date[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lte?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  gt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  gte?: Date;
}

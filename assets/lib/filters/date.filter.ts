import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class DateFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  equals?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  not?: Date;

  @ApiProperty({ required: false, type: [Date] })
  @IsOptional()
  @Type(() => Date)
  in?: Date[];

  @ApiProperty({ required: false, type: [Date] })
  @IsOptional()
  @Type(() => Date)
  notIn?: Date[];

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

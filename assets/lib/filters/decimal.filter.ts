import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class DecimalFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  equals?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  not?: number;

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  in?: number[];

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  notIn?: number[];

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

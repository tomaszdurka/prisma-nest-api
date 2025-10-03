import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class IntFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  equals?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  not?: number;

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  in?: number[];

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  notIn?: number[];

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

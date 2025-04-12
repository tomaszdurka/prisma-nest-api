import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class BaseFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  equals?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  not?: any;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  in?: any[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  notIn?: any[];
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class BooleanFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  equals?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  not?: boolean;
}

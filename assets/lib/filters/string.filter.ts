import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BaseFilter } from './base.filter';

export class StringFilter extends BaseFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  override equals?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  override not?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  override in?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  override notIn?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contains?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startsWith?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endsWith?: string;
  
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mode?: 'default' | 'insensitive';
}

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class StringFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  equals?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  not?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  in?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  notIn?: string[];

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

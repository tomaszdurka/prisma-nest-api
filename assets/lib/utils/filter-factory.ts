import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { StringFilter } from '../filters/string.filter';
import { IntFilter } from '../filters/int.filter';
import { DecimalFilter } from '../filters/decimal.filter';
import { DateFilter } from '../filters/date.filter';
import { BooleanFilter } from '../filters/boolean.filter';

export type ModelFilterType<T> = {
  [K in keyof T]?: T[K] extends string
    ? StringFilter
    : T[K] extends number
    ? IntFilter | DecimalFilter
    : T[K] extends Date
    ? DateFilter
    : T[K] extends boolean
    ? BooleanFilter
    : T[K] extends object
    ? ModelFilterType<T[K]>
    : any;
};

export interface FilterMetadata {
  propertyType: any;
  isArray?: boolean;
  isOptional?: boolean;
  description?: string;
}

export function createFilterClass<T extends object>(
  modelName: string,
  filterMetadata: Record<string, FilterMetadata>,
): new () => ModelFilterType<T> {
  class FilterClass {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    AND?: ModelFilterType<T>[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    OR?: ModelFilterType<T>[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    NOT?: ModelFilterType<T>;
  }

  // Add properties based on model structure
  for (const [key, metadata] of Object.entries(filterMetadata)) {
    console.log({key, metadata});
    const { propertyType, isArray = false, isOptional = true, description = '' } = metadata;
    
    // Add API property decorator
    ApiProperty({
      required: !isOptional,
      type: () => (isArray ? [propertyType] : propertyType),
      description,
    })(FilterClass.prototype, key);

    // Add validation decorators
    if (isOptional) {
      IsOptional()(FilterClass.prototype, key);
    }
    
    ValidateNested()(FilterClass.prototype, key);
    Type(() => propertyType)(FilterClass.prototype, key);
  }

  // Set class name for better debugging
  Object.defineProperty(FilterClass, 'name', {
    value: `${modelName}Filter`,
  });

  return FilterClass as any;
}

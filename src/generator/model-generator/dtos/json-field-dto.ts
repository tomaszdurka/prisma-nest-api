import { DMMF } from '@prisma/generator-helper';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';
import {
  isJsonField,
  getJsonFieldDtoName,
  fieldNameToKebabCase
} from '../utils/helpers';
import { toKebabCase } from '../../utils/string-formatter';

/**
 * Generate JSON field DTOs for a model
 * Only creates files if they don't already exist (user can customize them)
 */
export async function generateJsonFieldDtos(
  model: EnhancedModel,
  outputDir: string,
): Promise<void> {
  // Find all JSON fields in the model
  const jsonFields = model.fields.filter(field => isJsonField(field));

  // Generate a DTO for each JSON field
  for (const field of jsonFields) {
    await generateJsonFieldDto(model, field, outputDir);
  }
}

/**
 * Generate a single JSON field DTO
 * Creates the file only if it doesn't exist
 */
async function generateJsonFieldDto(
  model: EnhancedModel,
  field: DMMF.Field,
  outputDir: string,
): Promise<void> {
  const dtoClassName = getJsonFieldDtoName(field.name);
  const dtoFileName = `${fieldNameToKebabCase(field.name)}.dto.ts`;
  const filePath = path.join(outputDir, 'dto', dtoFileName);

  // Check if file already exists - if so, don't overwrite it
  try {
    await fs.access(filePath);
    // File exists, skip generation
    console.log(`  ⏭️  Skipping ${toKebabCase(model.name)}/${dtoFileName} (already exists, user-customizable)`);
    return;
  } catch {
    // File doesn't exist, create it
  }

  const decoratorName = `${dtoClassName}Property`;

  // Generate the DTO file content
  const content = `import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiPropertyOptions } from '@nestjs/swagger';
import { IsObject, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for ${field.name} JSON field in ${model.name}
 *
 * This file is auto-generated but will NOT be overwritten on subsequent generations.
 * You can safely add your custom fields and validation here.
 *
 * Example structure:
 * export class ${dtoClassName} {
 *   @ApiProperty()
 *   someField?: string;
 *
 *   @ApiProperty()
 *   anotherField?: number;
 * }
 */
export type ${dtoClassName} = {
}

export const ${dtoClassName}ApiPropertyOptions: ApiPropertyOptions = {
};

/**
 * Decorator for ${field.name} JSON field
 * Applies all necessary decorators for validation and documentation
 *
 * @param options - Configuration options
 * @param options.optional - Whether the field is optional (default: false)
 */
export function ${decoratorName}(options: { optional?: boolean } = {}) {
  const { optional = false } = options;

  if (optional) {
    return applyDecorators(
      ApiPropertyOptional(${dtoClassName}ApiPropertyOptions),
      IsOptional(),
    );
  }

  return applyDecorators(
    ApiProperty(${dtoClassName}ApiPropertyOptions),
    IsNotEmpty(),
  );
}
`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  console.log(`  ✅ Generated ${toKebabCase(model.name)}/${dtoFileName}`);
}

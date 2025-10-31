import { DMMF } from '@prisma/generator-helper';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';
import {
  isJsonField,
  getJsonFieldDtoName,
  getApiPropertyConfigName,
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

  const apiPropertyConfigName = getApiPropertyConfigName(dtoClassName);

  // Generate the DTO file content
  const content = `import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { ApiProperty } from '@nestjs/swagger';

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
export class ${dtoClassName} {
  // Add your custom fields here
}

export const ${apiPropertyConfigName}: ApiPropertyOptions = {
  type: ${dtoClassName},
};
`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  console.log(`  ✅ Generated ${toKebabCase(model.name)}/${dtoFileName}`);
}

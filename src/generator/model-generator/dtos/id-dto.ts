import { DMMF } from '@prisma/generator-helper';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';
import { ImportManager } from '../utils/import-manager';
import {getTypeScriptType, getValidatorForField, isEnumField} from '../utils/helpers';
import { toKebabCase } from '../../utils/string-formatter';

/**
 * Generate an ID DTO for a model (for primary and unique keys)
 */
export async function generateIdDto(
  model: EnhancedModel,
  outputDir: string,
  enums: DMMF.DatamodelEnum[] = [],
  prismaClientProvider: string,
  systemFields: string[] = []
): Promise<void> {
  const modelName = model.name;
  const dtoName = `${modelName}IdDto`;
  const fileName = `${toKebabCase(modelName)}-id.dto.ts`;
  const filePath = path.join(outputDir, 'dto', fileName);

  const importManager = new ImportManager();
  importManager.addImport('@nestjs/swagger', 'ApiProperty');

  let properties = '';
  const usedValidators = new Set<string>(['IsNotEmpty']);
  const usedEnums = new Set<string>();

  // Get only primary key fields (either single @id field or composite @@id fields)
  // and exclude system fields
  const primaryKeyFields = model.fields.filter(field => {
    // Skip system fields
    if (systemFields.includes(field.name)) {
      return false;
    }

    // Check for single-field primary key
    if (field.isId) {
      return true;
    }

    // Check for composite primary key using @@id directive
    if (model.primaryKey && model.primaryKey.fields.includes(field.name)) {
      return true;
    }

    return false;
  });

  if (primaryKeyFields.length === 0) {
    // If no primary key fields, just use 'id' if it exists
    const idField = model.fields.find(field => field.name === 'id');
    if (idField) {
      primaryKeyFields.push(idField);
    }
  }

  for (const field of primaryKeyFields) {
    const typeScriptType = getTypeScriptType(field, enums);
    if (typeScriptType.includes('Prisma')) {
      importManager.addImport('../../prisma', ['Prisma'])
    }

    // Handle enum types
    if (isEnumField(field, enums)) {
      const enumName = field.type;
      usedEnums.add(enumName as string);
    }

    // Add ApiProperty
    properties += `  @ApiProperty({ description: '${field.name} identifier' })\n`;

    // Use IsNotEmpty for both optional and required fields in ID DTOs
    properties += `  @IsNotEmpty()\n`;

    // Add appropriate validator based on field type
    const validator = getValidatorForField(field);
    if (validator) {
      properties += `  @${validator}()\n`;
      usedValidators.add(validator);
    }

    // Add transform decorator for number types
    if (field.type === 'Int') {
      properties += `  @Transform(({ value }) => value !== undefined ? Number(value) : undefined)\n`;
      importManager.addImport('class-transformer', 'Transform');
    } else if (field.type === 'Float' || field.type === 'Decimal') {
      properties += `  @Transform(({ value }) => value !== undefined ? parseFloat(value) : undefined)\n`;
      importManager.addImport('class-transformer', 'Transform');
    } else if (field.type === 'DateTime') {
      properties += `  @Type(() => Date)\n`;
      importManager.addImport('class-transformer', 'Type');
    }

    // All fields in ID DTOs should be required (use ! for non-null assertion)
    properties += `  ${field.name}!: ${typeScriptType};\n\n`;
  }

  // Import class-validator decorators
  importManager.addImport('class-validator', Array.from(usedValidators));

  // If we have enums, import them from the Prisma client
  if (usedEnums.size > 0 && prismaClientProvider) {
    importManager.addImport(prismaClientProvider, Array.from(usedEnums));
  }

  // Generate content with imports
  let content = importManager.generateImports();
  content += `export class ${dtoName} {\n`;
  content += properties;
  content += '}\n';

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

import { DMMF } from '@prisma/generator-helper';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';
import { ImportManager } from '../utils/import-manager';
import {
  getValidatorForField,
  shouldIncludeFieldInDto,
  isEnumField,
  getTypeScriptInputType,
  isJsonField,
  getJsonFieldDtoName,
  getJsonFieldDecoratorName,
  fieldNameToKebabCase
} from '../utils/helpers';
import { toKebabCase } from '../../utils/string-formatter';

/**
 * Generate Update DTO for a model
 */
export async function generateUpdateDto(
  model: EnhancedModel,
  outputDir: string,
  enums: DMMF.DatamodelEnum[] = [],
  systemFields: string[] = []
): Promise<void> {
  const className = `Update${model.name}Dto`;
  const fileName = `update-${toKebabCase(model.name)}.dto.ts`;
  const filePath = path.join(outputDir, 'dto', fileName);

  // Use import manager to track imports
  const importManager = new ImportManager();

  // Set to track which enums are actually used
  const usedEnums = new Set<string>();

  // Set to track which validators are actually used
  const usedValidators = new Set<string>();
  usedValidators.add('IsOptional'); // Always used for update DTOs

  // Track custom DTO types for importing
  const customDtoImports = new Map<string, string>(); // dtoType -> import path

  let properties = '';

  // Process all fields that should be included
  for (const field of model.fields) {
    // Skip system fields
    if (systemFields.includes(field.name)) {
      continue;
    }

    if (!shouldIncludeFieldInDto(field, model, true)) {
      continue;
    }

    // All fields in Update DTOs are optional
    const typeScriptType = getTypeScriptInputType(field, enums);
    if (typeScriptType.includes('Prisma')) {
      importManager.addImport('@prisma/client', ['Prisma'])
    }

    // Check if this is a read-only field but allowed in DTO
    const isReadOnly = field.isReadOnly && !(
      model._foreignKeys && model._foreignKeys.has(field.name) &&
      model._relationFields &&
      model._relationFields.get(field.name) &&
      !model._relationFields.get(field.name)!.isReadOnly
    );

    // Import enum if needed
    if (isEnumField(field, enums)) {
      usedEnums.add(field.type);
    }

    // Check if this field is a JSON type
    const isJson = isJsonField(field);

    if (isJson) {
      const jsonDtoType = getJsonFieldDtoName(field.name);
      const jsonDecoratorName = getJsonFieldDecoratorName(jsonDtoType);
      const dtoFileName = fieldNameToKebabCase(field.name);
      const importPath = `./${dtoFileName}.dto`;

      // Track the JSON DTO import
      if (!customDtoImports.has(jsonDtoType)) {
        customDtoImports.set(jsonDtoType, importPath);
      }

      // Import the decorator function and DTO type
      importManager.addImport(importPath, [jsonDtoType, jsonDecoratorName]);
      properties += `  @${jsonDecoratorName}({ optional: true })\n`;
    } else if (isEnumField(field, enums)) {
      importManager.addImport('@nestjs/swagger', 'ApiPropertyOptional');
      properties += `  @ApiPropertyOptional({ enum: ${field.type}, enumName: '${field.type}' })\n`;
      properties += `  @IsOptional()\n`;

      const validator = getValidatorForField(field);
      if (validator) {
        usedValidators.add(validator);
        properties += `  @${validator}()\n`;
      }
    } else {
      importManager.addImport('@nestjs/swagger', 'ApiPropertyOptional');
      properties += `  @ApiPropertyOptional()\n`;
      properties += `  @IsOptional()\n`;

      // Add type-specific validator if available
      const validator = getValidatorForField(field);
      if (validator) {
        usedValidators.add(validator);
        properties += `  @${validator}()\n`;
      }
    }

    // Handle type transformations
    if (field.type === 'Int') {
      properties += `  @Transform(({ value }) => value !== undefined ? parseInt(value, 10) : undefined)\n`;
      importManager.addImport('class-transformer', 'Transform');
    } else if (field.type === 'Float' || field.type === 'Decimal') {
      properties += `  @Transform(({ value }) => value !== undefined ? parseFloat(value) : undefined)\n`;
      importManager.addImport('class-transformer', 'Transform');
    } else if (field.type === 'DateTime') {
      properties += `  @Type(() => Date)\n`;
      importManager.addImport('class-transformer', 'Type');
    }

    // Add field property with appropriate readonly modifier
    if (isReadOnly) {
      properties += `  readonly ${field.name}?: ${typeScriptType};\n\n`;
    } else {
      properties += `  ${field.name}?: ${typeScriptType};\n\n`;
    }
  }

  // Add import for class-validator
  importManager.addImport('class-validator', Array.from(usedValidators));

  // If we have enums, import them from the Prisma client
  if (usedEnums.size > 0) {
    importManager.addImport('@prisma/client', Array.from(usedEnums));
  }

  // Import Prisma if we have decimal fields
  if (model.fields.some(field => field.type === 'Decimal')) {
    importManager.addImport('@prisma/client', 'Prisma');
  }

  // Generate content with imports
  let content = importManager.generateImports();
  content += `export class ${className} {\n`;
  content += properties;
  content += '}\n';

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

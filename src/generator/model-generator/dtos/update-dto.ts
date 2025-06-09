import { DMMF } from '@prisma/generator-helper';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';
import { ImportManager } from '../utils/import-manager';
import { getTypeScriptType, getValidatorForField, shouldIncludeFieldInDto, isEnumField } from '../utils/helpers';

/**
 * Generate Update DTO for a model
 */
export async function generateUpdateDto(
  model: EnhancedModel,
  outputDir: string,
  enums: DMMF.DatamodelEnum[] = [],
  prismaClientProvider: string
): Promise<void> {
  const className = `Update${model.name}Dto`;
  const fileName = `update-${model.name.toLowerCase()}.dto.ts`;
  const filePath = path.join(outputDir, 'dto', fileName);

  // Use import manager to track imports
  const importManager = new ImportManager();

  // Set to track which enums are actually used
  const usedEnums = new Set<string>();

  // Set to track which validators are actually used
  const usedValidators = new Set<string>();
  usedValidators.add('IsOptional'); // Always used for update DTOs

  let properties = '';

  // Process all fields that should be included
  for (const field of model.fields) {
    if (!shouldIncludeFieldInDto(field, model, true)) {
      continue;
    }

    // All fields in Update DTOs are optional
    const typeScriptType = getTypeScriptType(field, enums);

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

      importManager.addImport('@nestjs/swagger', 'ApiPropertyOptional');
      properties += `  @ApiPropertyOptional({ enum: ${field.type}, enumName: '${field.type}' })\n`;
    } else {
      importManager.addImport('@nestjs/swagger', 'ApiPropertyOptional');
      properties += `  @ApiPropertyOptional()\n`;
    }

    // Add validator decorators
    properties += `  @IsOptional()\n`;

    // Add type-specific validator if available
    const validator = getValidatorForField(field);
    if (validator) {
      usedValidators.add(validator);
      properties += `  @${validator}()\n`;
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
    importManager.addImport(prismaClientProvider, Array.from(usedEnums));
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

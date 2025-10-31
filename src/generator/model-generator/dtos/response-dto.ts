import { DMMF } from '@prisma/generator-helper';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';
import { ImportManager } from '../utils/import-manager';
import {
  getTypeScriptType,
  isEnumField,
  isJsonField,
  getJsonFieldDtoName,
  getApiPropertyConfigName,
  fieldNameToKebabCase
} from '../utils/helpers';
import { toKebabCase } from '../../utils/string-formatter';

/**
 * Generate Response DTO for a model
 */
export async function generateDto(
  model: EnhancedModel,
  outputDir: string,
  enums: DMMF.DatamodelEnum[] = [],
): Promise<void> {
  // Generate both standard response DTO and list response DTO
  await generateModelDto(model, outputDir, enums);
  await generateListDto(model, outputDir);
}

/**
 * Generate the standard Response DTO for a model
 */
async function generateModelDto(
  model: EnhancedModel,
  outputDir: string,
  enums: DMMF.DatamodelEnum[] = [],
): Promise<void> {
  const className = `${model.name}Dto`;
  const fileName = `${toKebabCase(model.name)}.dto.ts`;
  const filePath = path.join(outputDir, 'dto', fileName);

  // Use import manager to track imports
  const importManager = new ImportManager();
  importManager.addImport('@nestjs/swagger', 'ApiProperty');

  // Set to track which enums are actually used
  const usedEnums = new Set<string>();

  // Track custom DTO types for importing
  const customDtoImports = new Map<string, string>(); // dtoType -> import path

  let properties = '';

  // Process all fields (including all scalar fields regardless of read-only status, but excluding relations)
  for (const field of model.fields) {
    // Skip object fields (relations)
    if (field.kind === 'object') {
      continue;
    }

    const typeScriptType = getTypeScriptType(field, enums);
    if (typeScriptType.includes('Prisma')) {
      importManager.addImport('@prisma/client', ['Prisma'])
    }

    // Determine if this is a genuine read-only field (not a foreign key part of a relation)
    const isForeignKeyInRelation = model._foreignKeys && model._foreignKeys.has(field.name) &&
      model._relationFields &&
      model._relationFields.get(field.name);

    // Check if this field is a JSON type
    const isJson = isJsonField(field);
    let jsonDtoType: string | undefined;

    if (isJson) {
      jsonDtoType = getJsonFieldDtoName(field.name);
      const dtoFileName = fieldNameToKebabCase(field.name);
      const importPath = `./${dtoFileName}.dto`;
      const apiPropertyConfig = getApiPropertyConfigName(jsonDtoType);

      // Track the JSON DTO import
      if (!customDtoImports.has(jsonDtoType)) {
        customDtoImports.set(jsonDtoType, importPath);
      }

      // Import the API property config and DTO type
      importManager.addImport(importPath, [jsonDtoType, apiPropertyConfig]);

      // Use JSON DTO API property config
      properties += `  @ApiProperty(${apiPropertyConfig})\n`;
    } else if (isEnumField(field, enums)) {
      // Import enum if needed
      usedEnums.add(field.type);

      // Add enum values to API property
      properties += `  @ApiProperty({ enum: ${field.type}, enumName: '${field.type}' })\n`;
    } else {
      properties += `  @ApiProperty()\n`;
    }

    // Mark field as readonly if it's a read-only field OR if it's a foreign key
    if (field.isReadOnly || isForeignKeyInRelation) {
      properties += `  readonly ${field.name}!: ${typeScriptType};\n\n`;
    } else {
      properties += `  ${field.name}!: ${typeScriptType};\n\n`;
    }
  }

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

  // Also generate response DTO with relations
  await generateDtoWithRelations(model, outputDir);
}

/**
 * Generate List Response DTO for a model (for paginated responses)
 */
async function generateListDto(
  model: EnhancedModel,
  outputDir: string,
): Promise<void> {
  const className = `${model.name}ListDto`;
  const fileName = `${toKebabCase(model.name)}-list.dto.ts`;
  const filePath = path.join(outputDir, 'dto', fileName);

  // Use import manager to track imports
  const importManager = new ImportManager();
  importManager.addImport('@nestjs/swagger', 'ApiProperty');
  importManager.addImport('class-validator', 'IsArray');
  importManager.addImport('class-validator', 'IsInt');
  importManager.addImport(`./${toKebabCase(model.name)}.dto`, `${model.name}Dto`);

  let content = importManager.generateImports();
  content += `export class ${className} {\n`;
  
  // Add items array property
  content += `  @ApiProperty({\n`;
  content += `    isArray: true,\n`;
  content += `    type: ${model.name}Dto\n`;
  content += `  })\n`;
  content += `  @IsArray()\n`;
  content += `  items!: ${model.name}Dto[];\n\n`;
  
  // Add total count property
  content += `  @ApiProperty({\n`;
  content += `    type: 'integer'\n`;
  content += `  })\n`;
  content += `  @IsInt()\n`;
  content += `  total!: number;\n`;
  
  content += `}\n`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}


/**
 * Generate Response DTO with relations for a model
 */
export async function generateDtoWithRelations(
  model: EnhancedModel,
  outputDir: string,
): Promise<void> {
  const className = `${model.name}WithRelationsDto`;
  const fileName = `${toKebabCase(model.name)}-with-relations.dto.ts`;
  const filePath = path.join(outputDir, 'dto', fileName);

  // Use import manager to track imports
  const importManager = new ImportManager();
  importManager.addImport('@nestjs/swagger', 'ApiProperty');
  importManager.addImport(`./${toKebabCase(model.name)}.dto`, `${model.name}Dto`);

  // Check if the model has any Decimal fields
  const hasDecimalFields = model.fields.some(field => field.type === 'Decimal');
  if (hasDecimalFields) {
    importManager.addImport('@prisma/client', 'Prisma');
  }

  // Set to track which relation types are used
  const usedRelations = new Set<string>();

  let properties = '';

  // Add relation fields
  for (const field of model.fields) {
    // Only include object fields (relations)
    if (field.kind !== 'object') {
      continue;
    }

    const relationType = field.type;
    const isArray = field.isList;
    const isOptional = !field.isRequired;

    // Track relation types for imports
    usedRelations.add(relationType);

    // Set up the type string
    const relatedDtoType = `${relationType}Dto`;

    // Check if the relation type is the same as the current model (self-reference)
    if (relationType === model.name) {
      // Use local import for self-references
      importManager.addImport(`./${toKebabCase(model.name)}.dto`, relatedDtoType);
    } else {
      // Use external import for other models
      importManager.addImport(`../../${toKebabCase(relationType)}`, relatedDtoType);
    }

    // Add API property
    properties += `  @ApiProperty()\n`;

    // All relation fields in response DTOs should be marked as readonly
    properties += `  readonly ${field.name}${isOptional ? '?' : '!'}: ${isArray ? `${relatedDtoType}[]` : relatedDtoType};\n\n`;
  }

  // Generate content with imports
  let content = importManager.generateImports();
  content += `export class ${className} extends ${model.name}Dto {\n`;
  content += properties;
  content += '}\n';

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

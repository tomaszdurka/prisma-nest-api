import * as path from 'path';
import * as fs from 'fs/promises';
import {EnhancedModel} from '../utils/types';
import {ImportManager} from '../utils/import-manager';
import {getOperatorsForFieldType, getTypeScriptTypeForOperator} from '../utils/helpers';
import {toKebabCase} from '../../utils/string-formatter';

/**
 * Generate a flattened query DTO for a model
 */
export async function generateFlatQueryDto(
  model: EnhancedModel,
  outputDir: string,
): Promise<void> {
  const className = `FlatQuery${model.name}Dto`;
  const fileName = `flat-query-${toKebabCase(model.name)}.dto.ts`;
  const filePath = path.join(outputDir, 'dto', fileName);

  const importManager = new ImportManager();
  importManager.addImport('@nestjs/swagger', 'ApiPropertyOptional');
  importManager.addImport('class-validator', ['IsOptional', 'IsString', 'IsInt', 'IsNumber', 'IsBoolean', 'IsDate', 'IsEnum', 'Min', 'Max']);
  importManager.addImport('class-transformer', ['Transform', 'Type']);
  
  // Collect enum types that need to be imported
  const enumTypesToImport = new Set<string>();
  for (const field of model.fields) {
    if (field.kind === 'enum') {
      enumTypesToImport.add(field.type);
    }
  }
  
  // Import enum types from Prisma
  if (enumTypesToImport.size > 0) {
    importManager.addImport('@prisma/client', Array.from(enumTypesToImport));
  }

  let properties = '';

  // Add standard pagination parameters
  properties += `  @ApiPropertyOptional({ description: 'Number of records to take', type: String })\n`;
  properties += `  @IsOptional()\n`;
  properties += `  @IsInt()\n`;
  properties += `  @Min(1)\n`;
  properties += `  @Max(100)\n`;
  properties += `  @Type(() => Number)\n`;
  properties += `  take = 25;\n\n`;

  properties += `  @ApiPropertyOptional({ description: 'Number of records to skip', type: String })\n`;
  properties += `  @IsOptional()\n`;
  properties += `  @IsInt()\n`;
  properties += `  @Min(0)\n`;
  properties += `  @Type(() => Number)\n`;
  properties += `  skip = 0;\n\n`;

  // Add model-specific filter properties with flattened structure
  for (const field of model.fields) {
    if (field.relationName) continue; // Skip relation fields

    // Check if field is an enum
    const isEnum = field.kind === 'enum';
    
    // For each field, add the appropriate operators based on field type and purpose
    const isIdField = field.name === 'id' || field.name.endsWith('Id');
    let operators;

    if (isIdField) {
      // ID fields only get equals operator regardless of type
      operators = [{name: 'equals', description: 'equals'}];
    } else if (isEnum) {
      // Enum fields only get equals operator
      operators = [{name: 'equals', description: 'equals'}];
    } else {
      operators = getOperatorsForFieldType(field.type);
    }

    for (const op of operators) {
      // For 'equals' operator, use the bare field name without suffix
      const paramName = op.name === 'equals' ?
        field.name :
        `${field.name}_${op.name}`;

      // Add appropriate validation decorator based on field type
      if (isEnum) {
        properties += `  @ApiPropertyOptional({ description: \`Filter ${model.name} where ${field.name} ${op.description}\`, enum: ${field.type}, enumName: '${field.type}' })\n`;
        properties += `  @IsOptional()\n`;
        properties += `  @IsEnum(${field.type})\n`;
        // For enums, the TypeScript type is the enum name
        properties += `  ${paramName}?: ${field.type};\n\n`;
      } else {
        properties += `  @ApiPropertyOptional({ description: \`Filter ${model.name} where ${field.name} ${op.description}\` })\n`;
        properties += `  @IsOptional()\n`;
        
        if (field.type === 'String') {
          properties += `  @IsString()\n`;
          properties += `  ${paramName}?: ${getTypeScriptTypeForOperator(field.type)};\n\n`;
        } else if (field.type === 'Int') {
          properties += `  @IsInt()\n`;
          properties += `  @Type(() => Number)\n`;
          properties += `  ${paramName}?: ${getTypeScriptTypeForOperator(field.type)};\n\n`;
        } else if (field.type === 'Float' || field.type === 'Decimal') {
          properties += `  @IsNumber()\n`;
          properties += `  @Type(() => Number)\n`;
          properties += `  ${paramName}?: ${getTypeScriptTypeForOperator(field.type)};\n\n`;
        } else if (field.type === 'Boolean') {
          properties += `  @IsBoolean()\n`;
          properties += `  @Transform(({ value }) => value === 'true')\n`;
          properties += `  ${paramName}?: ${getTypeScriptTypeForOperator(field.type)};\n\n`;
        } else if (field.type === 'DateTime') {
          properties += `  @IsDate()\n`;
          properties += `  @Type(() => Date)\n`;
          properties += `  ${paramName}?: ${getTypeScriptTypeForOperator(field.type)};\n\n`;
        } else {
          properties += `  ${paramName}?: ${getTypeScriptTypeForOperator(field.type)};\n\n`;
        }
      }
    }
  }

  // Add transformation method to convert flat query to Prisma structure
  let transformMethod = `
  /**
   * Transform flat query parameters to Prisma query structure
   */
  toQuery() {
    const result: any = {
      take: this.take,
      skip: this.skip,
      where: {}
    };

    // Process all filter parameters
    for (const [key, value] of Object.entries(this)) {
      if (key === 'take' || key === 'skip' || value === undefined) {
        continue;
      }

      const parts = key.split('_');
      if (parts.length === 2) {
        // Handle field_operator pattern (e.g. firstName_contains)
        const [fieldName, operator] = parts;
        
        // Initialize the field object if it doesn't exist
        if (!result.where[fieldName]) {
          result.where[fieldName] = {};
        }
        
        // Set the operator
        result.where[fieldName][operator] = value;
      } else if (parts.length === 1) {
        // Handle direct field name (equals operator)
        const fieldName = key;
        
        // Initialize the field object if it doesn't exist
        if (!result.where[fieldName]) {
          result.where[fieldName] = {};
        }
        
        // Use equals operator
        result.where[fieldName]['equals'] = value;
      }
    }

    return result;
  }
`;

  // Generate content with imports
  let content = importManager.generateImports();
  content += `export class ${className} {\n`;
  content += properties;
  content += transformMethod;
  content += '}\n';

  await fs.mkdir(path.dirname(filePath), {recursive: true});
  await fs.writeFile(filePath, content);
}

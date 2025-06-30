import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';
import { ImportManager } from '../utils/import-manager';
import { toKebabCase } from '../../utils/string-formatter';

/**
 * Generate Filter Classes for a model
 * This creates two classes:
 * 1. A base filter class with properties for each field
 * 2. A where filter class that extends the base and adds AND/OR/NOT operators
 */
export async function generateFilterClass(model: EnhancedModel, outputDir: string, systemFields: string[] = []): Promise<void> {
  const baseClassName = `${model.name}Filter`;
  const whereClassName = `${model.name}WhereFilter`;
  const fileName = `${toKebabCase(model.name)}.filter.ts`;
  const filePath = path.join(outputDir, 'dto', fileName);

  // Use import manager to track imports
  const importManager = new ImportManager();

  // Add imports for filter types
  importManager.addImport('@nestjs/swagger', ['ApiProperty']);
  importManager.addImport('class-validator', ['IsOptional']);
  importManager.addImport('class-transformer', ['Type']);

  // Determine which filter types are actually used
  const usedFilterTypes = new Set<string>();

  // Generate the base filter class
  let baseFilterClass = `/**\n * Filter class for ${model.name} model fields\n */\nexport class ${baseClassName} {\n`;

  // Add properties for each field
  for (const field of model.fields) {
    // Skip relation fields and system fields
    if (field.relationName || systemFields.includes(field.name)) continue;

    let importType;
    let tsType;

    switch (field.type) {
      case 'String':
        importType = 'StringFilter';
        tsType = 'StringFilter';
        break;
      case 'Int':
        importType = 'IntFilter';
        tsType = 'IntFilter';
        break;
      case 'Float':
      case 'Decimal':
        importType = 'DecimalFilter';
        tsType = 'DecimalFilter';
        break;
      case 'Boolean':
        importType = 'BooleanFilter';
        tsType = 'BooleanFilter';
        break;
      case 'DateTime':
        importType = 'DateFilter';
        tsType = 'DateFilter';
        break;
      default:
        // For enums, use StringFilter as it's most appropriate
        importType = 'StringFilter';
        tsType = 'StringFilter';
    }

    usedFilterTypes.add(importType);

    // Add the property to the class
    baseFilterClass += `  @ApiProperty({ required: false, type: () => ${tsType} })\n`;
    baseFilterClass += `  @IsOptional()\n`;
    baseFilterClass += `  @Type(() => ${tsType})\n`;
    baseFilterClass += `  ${field.name}?: ${tsType};\n\n`;
  }

  baseFilterClass += `}\n\n`;

  // Generate the where filter class that extends the base class
  let whereFilterClass = `/**\n * Where filter class for ${model.name} model with AND/OR/NOT operators\n */\nexport class ${whereClassName} extends ${baseClassName} {\n`;

  // Add AND, OR, NOT operators
  whereFilterClass += `  @ApiProperty({ required: false, type: () => [${whereClassName}], isArray: true })\n`;
  whereFilterClass += `  @IsOptional()\n`;
  whereFilterClass += `  @Type(() => ${whereClassName})\n`;
  whereFilterClass += `  AND?: ${whereClassName}[];\n\n`;

  whereFilterClass += `  @ApiProperty({ required: false, type: () => [${whereClassName}], isArray: true })\n`;
  whereFilterClass += `  @IsOptional()\n`;
  whereFilterClass += `  @Type(() => ${whereClassName})\n`;
  whereFilterClass += `  OR?: ${whereClassName}[];\n\n`;

  whereFilterClass += `  @ApiProperty({ required: false, type: () => ${whereClassName} })\n`;
  whereFilterClass += `  @IsOptional()\n`;
  whereFilterClass += `  @Type(() => ${whereClassName})\n`;
  whereFilterClass += `  NOT?: ${whereClassName};\n`;

  whereFilterClass += `}\n`;

  // Only import filter types that are actually used
  importManager.addImport('../../lib', Array.from(usedFilterTypes));

  // Generate content with imports
  let content = importManager.generateImports();
  content += `\n${baseFilterClass}\n${whereFilterClass}\n`;

  // Create directory if it doesn't exist and write the file
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

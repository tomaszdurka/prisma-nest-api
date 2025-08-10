import * as path from 'path';
import * as fs from 'fs/promises';
import { DMMF } from '@prisma/generator-helper';
import { ImportManager } from './model-generator/utils/import-manager';
import { toKebabCase } from './utils/string-formatter';

interface GenerateEnumFiltersOptions {
  enums: DMMF.DatamodelEnum[];
  outputDir: string;
}

/**
 * Generate all enum filters in a central location
 */
export async function generateEnumFilters(options: GenerateEnumFiltersOptions): Promise<void> {
  const { enums, outputDir } = options;
  
  if (enums.length === 0) return;

  // Create enum-filters directory
  const enumFiltersDir = path.join(outputDir, 'enum-filters');
  await fs.mkdir(enumFiltersDir, { recursive: true });

  // Generate a filter class for each enum
  for (const enumDef of enums) {
    await generateEnumFilter(enumDef, enumFiltersDir);
  }

  // Generate index file to export all enum filters
  await generateEnumFiltersIndex(enums, enumFiltersDir);
}

/**
 * Generate a single enum filter class
 */
async function generateEnumFilter(enumDef: DMMF.DatamodelEnum, outputDir: string): Promise<void> {
  const filterClassName = `${enumDef.name}Filter`;
  const fileName = `${toKebabCase(enumDef.name)}.filter.ts`;
  const filePath = path.join(outputDir, fileName);

  // Check if this enum filter already exists
  try {
    await fs.access(filePath);
    // File already exists, skip generation
    return;
  } catch {
    // File doesn't exist, generate it
  }

  const importManager = new ImportManager();
  importManager.addImport('@nestjs/swagger', ['ApiProperty']);
  importManager.addImport('class-validator', ['IsOptional', 'IsEnum']);
  importManager.addImport('../prisma', [enumDef.name]);

  let content = importManager.generateImports();
  content += '\n';

  // Generate the enum filter class
  content += `/**\n`;
  content += ` * Filter for ${enumDef.name} enum\n`;
  content += ` */\n`;
  content += `export class ${filterClassName} {\n`;

  // equals property
  content += `  @ApiProperty({ required: false, enum: ${enumDef.name}, enumName: '${enumDef.name}' })\n`;
  content += `  @IsOptional()\n`;
  content += `  @IsEnum(${enumDef.name})\n`;
  content += `  equals?: ${enumDef.name};\n\n`;

  // not property
  content += `  @ApiProperty({ required: false, enum: ${enumDef.name}, enumName: '${enumDef.name}' })\n`;
  content += `  @IsOptional()\n`;
  content += `  @IsEnum(${enumDef.name})\n`;
  content += `  not?: ${enumDef.name};\n\n`;

  // in property
  content += `  @ApiProperty({ required: false, enum: ${enumDef.name}, enumName: '${enumDef.name}', isArray: true })\n`;
  content += `  @IsOptional()\n`;
  content += `  @IsEnum(${enumDef.name}, { each: true })\n`;
  content += `  in?: ${enumDef.name}[];\n\n`;

  // notIn property
  content += `  @ApiProperty({ required: false, enum: ${enumDef.name}, enumName: '${enumDef.name}', isArray: true })\n`;
  content += `  @IsOptional()\n`;
  content += `  @IsEnum(${enumDef.name}, { each: true })\n`;
  content += `  notIn?: ${enumDef.name}[];\n`;

  content += `}\n`;

  await fs.writeFile(filePath, content);
}

/**
 * Generate index file for all enum filters
 */
async function generateEnumFiltersIndex(enums: DMMF.DatamodelEnum[], outputDir: string): Promise<void> {
  const indexPath = path.join(outputDir, 'index.ts');

  let content = '// Export all enum filters\n';
  for (const enumDef of enums) {
    const fileName = toKebabCase(enumDef.name);
    content += `export * from './${fileName}.filter';\n`;
  }

  await fs.writeFile(indexPath, content);
}

import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';
import { ImportManager } from '../utils/import-manager';

/**
 * Generate FindMany DTO for a model
 */
export async function generateFindManyDto(model: EnhancedModel, outputDir: string): Promise<void> {
  const className = `FindMany${model.name}Dto`;
  const fileName = `find-many-${model.name.toLowerCase()}.dto.ts`;
  const filePath = path.join(outputDir, 'dto', fileName);

  // Use import manager to track imports
  const importManager = new ImportManager();
  importManager.addImport('@nestjs/swagger', 'ApiPropertyOptional');
  importManager.addImport('class-transformer', ['Transform']);
  importManager.addImport('class-validator', ['IsOptional', 'ValidateNested', 'IsInt', 'Min']);

  // We're no longer extending FindManyRequest, we'll implement it directly
  // importManager.addImport('prisma-nest-api', 'FindManyRequest');

  importManager.addImport(`./${model.name.toLowerCase()}.filter`, [`${model.name}Filter`, `${model.name}WhereFilter`]);

  // Generate content with imports
  let content = importManager.generateImports();

  // Create the class directly instead of extending
  content += `export class ${className} {\n`;

  // Where clause (filter)
  content += `  @ApiPropertyOptional({ type: ${model.name}WhereFilter })\n`;
  content += `  @IsOptional()\n`;
  content += `  @ValidateNested()\n`;
  content += `  where?: ${model.name}WhereFilter;\n\n`;

  // Flattened pagination parameters
  // Take parameter
  content += `  @ApiPropertyOptional({ description: 'Number of records to take', default: 10 })\n`;
  content += `  @IsOptional()\n`;
  content += `  @IsInt()\n`;
  content += `  @Min(1)\n`;
  content += `  @Transform(({ value }) => value !== undefined ? Number(value) : 10)\n`;
  content += `  take = 10;\n\n`;

  // Skip parameter
  content += `  @ApiPropertyOptional({ description: 'Number of records to skip', default: 0 })\n`;
  content += `  @IsOptional()\n`;
  content += `  @IsInt()\n`;
  content += `  @Min(0)\n`;
  content += `  @Transform(({ value }) => value !== undefined ? Number(value) : 0)\n`;
  content += `  skip = 0;\n\n`;

  // Cursor parameter
  content += `  @ApiPropertyOptional({ description: 'Record to start from' })\n`;
  content += `  @IsOptional()\n`;
  content += `  cursor?: Record<string, any>;\n\n`;

  // OrderBy parameter
  content += `  @ApiPropertyOptional({ description: 'Ordering of results' })\n`;
  content += `  @IsOptional()\n`;
  content += `  orderBy?: Record<string, 'asc' | 'desc'>;\n`;

  content += `}\n`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

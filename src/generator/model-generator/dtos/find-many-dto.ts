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

  importManager.addImport(`./${model.name.toLowerCase()}.filter`, `${model.name}Filter`);

  // Generate content with imports
  let content = importManager.generateImports();

  // Create the class directly instead of extending
  content += `export class ${className} {\n`;

  // Where clause (filter)
  content += `  @ApiPropertyOptional({ type: ${model.name}Filter })\n`;
  content += `  @IsOptional()\n`;
  content += `  @ValidateNested()\n`;
  content += `  @Transform(({ value }) => value)\n`;
  content += `  where?: InstanceType<typeof ${model.name}Filter>;\n\n`;

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

  // Also generate the filter class
  await generateFilterClass(model, outputDir);
}


/**
 * Generate Filter Class for a model
 */
export async function generateFilterClass(model: EnhancedModel, outputDir: string): Promise<void> {
  const className = `${model.name}Filter`;
  const fileName = `${model.name.toLowerCase()}.filter.ts`;
  const filePath = path.join(outputDir, 'dto', model.name.toLowerCase(), fileName);

  // Use import manager to track imports
  const importManager = new ImportManager();
  importManager.addImport('../../lib', ['createFilterClass', 'FilterMetadata']);

  // Determine which filter types are actually used
  const usedFilterTypes = new Set<string>();

  // Add filter metadata for each field
  let filterMetadata = `const ${model.name.toLowerCase()}FilterMetadata: Record<string, FilterMetadata> = {\n`;

  for (const field of model.fields) {
    if (field.relationName) continue;

    let filterType;
    switch (field.type) {
      case 'String':
        filterType = 'StringFilter';
        break;
      case 'Int':
        filterType = 'IntFilter';
        break;
      case 'Float':
      case 'Decimal':
        filterType = 'DecimalFilter';
        break;
      case 'Boolean':
        filterType = 'BooleanFilter';
        break;
      case 'DateTime':
        filterType = 'DateFilter';
        break;
      default:
        // For enums, use StringFilter as it's most appropriate
        filterType = 'StringFilter';
    }

    usedFilterTypes.add(filterType);
    filterMetadata += `  ${field.name}: { propertyType: ${filterType}, isOptional: true },\n`;
  }

  filterMetadata += `};\n\n`;

  // Only import filter types that are actually used
  importManager.addImport('../../lib', Array.from(usedFilterTypes));

  // Generate content with imports
  let content = importManager.generateImports();

  content += `// Filter metadata for ${model.name} model\n`;
  content += filterMetadata;

  content += `// Generate the filter class using the utility function\n`;
  content += `export const ${className} = createFilterClass('${model.name}', ${model.name.toLowerCase()}FilterMetadata);\n`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

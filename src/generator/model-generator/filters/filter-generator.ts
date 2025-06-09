import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';
import { ImportManager } from '../utils/import-manager';

/**
 * Generate Filter Class for a model
 */
export async function generateFilterClass(model: EnhancedModel, outputDir: string): Promise<void> {
  const className = `${model.name}Filter`;
  const fileName = `${model.name.toLowerCase()}.filter.ts`;
  const filePath = path.join(outputDir, 'dto', fileName);

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

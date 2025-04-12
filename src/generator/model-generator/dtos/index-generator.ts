import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';

/**
 * Generate model index file to export all DTOs
 */
export async function generateModelIndexFile(model: EnhancedModel, outputDir: string): Promise<void> {
  const modelName = model.name;
  const indexFilePath = path.join(outputDir, 'dto', modelName.toLowerCase(), 'index.ts');

  let content = `export * from './create-${modelName.toLowerCase()}.dto';\n`;
  content += `export * from './update-${modelName.toLowerCase()}.dto';\n`;
  content += `export * from './${modelName.toLowerCase()}-response.dto';\n`;
  content += `export * from './find-many-${modelName.toLowerCase()}.dto';\n`;
  content += `export * from './flat-query-${modelName.toLowerCase()}.dto';\n`;
  content += `export * from './${modelName.toLowerCase()}-id.dto';\n`;

  await fs.mkdir(path.dirname(indexFilePath), { recursive: true });
  await fs.writeFile(indexFilePath, content);
}

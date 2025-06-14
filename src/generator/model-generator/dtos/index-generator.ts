import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedModel } from '../utils/types';
import { toKebabCase } from '../../utils/string-formatter';

/**
 * Generate model index file to export all DTOs
 */
export async function generateModelIndexFile(model: EnhancedModel, outputDir: string): Promise<void> {
  const modelName = model.name;
  const indexFilePath = path.join(outputDir, 'dto', 'index.ts');

  let content = `export * from './create-${toKebabCase(modelName)}.dto';\n`;
  content += `export * from './update-${toKebabCase(modelName)}.dto';\n`;
  content += `export * from './${toKebabCase(modelName)}.dto';\n`;
  content += `export * from './find-many-${toKebabCase(modelName)}.dto';\n`;
  content += `export * from './flat-query-${toKebabCase(modelName)}.dto';\n`;
  content += `export * from './${toKebabCase(modelName)}-id.dto';\n`;

  await fs.mkdir(path.dirname(indexFilePath), { recursive: true });
  await fs.writeFile(indexFilePath, content);
}

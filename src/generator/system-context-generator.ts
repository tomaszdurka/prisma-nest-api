import * as path from 'path';
import * as fs from 'fs/promises';

interface GenerateSystemContextOptions {
  outputDir: string;
  systemFields: string[];
}

/**
 * Generate SystemContextService and SystemContextModule
 */
export async function generateSystemContext(options: GenerateSystemContextOptions): Promise<void> {
  const { outputDir, systemFields } = options;

  // Create system-context directory
  const systemContextDir = path.join(outputDir, 'system-context');
  await fs.mkdir(systemContextDir, { recursive: true });

  // Generate service
  await generateSystemContextService(systemContextDir, systemFields);

  // Generate module
  await generateSystemContextModule(systemContextDir);
}

/**
 * Generate SystemContextService
 */
async function generateSystemContextService(outputDir: string, systemFields: string[]): Promise<void> {
  const filePath = path.join(outputDir, 'system-context.service.ts');

  let content = `import { Injectable } from '@nestjs/common';\n\n`;
  content += `@Injectable()\n`;
  content += `export class SystemContextService {\n`;

  // Generate methods for each system field
  for (const field of systemFields) {
    content += `  get${capitalizeFirstLetter(field)}(): any {\n`;
    content += `    return;\n`;
    content += `  }\n\n`;
  }

  // Generate getFields method
  content += `  getFields(): Record<string, any> {\n`;
  content += `    return {\n`;

  // Add each system field to the returned object
  for (const field of systemFields) {
    content += `      ${field}: this.get${capitalizeFirstLetter(field)}(),\n`;
  }

  content += `    };\n`;
  content += `  }\n`;
  content += `}\n`;

  await fs.writeFile(filePath, content);
}

/**
 * Generate SystemContextModule
 */
async function generateSystemContextModule(outputDir: string): Promise<void> {
  const filePath = path.join(outputDir, 'system-context.module.ts');

  let content = `import { Module } from '@nestjs/common';\n`;
  content += `import { SystemContextService } from './system-context.service';\n\n`;
  content += `@Module({\n`;
  content += `  providers: [SystemContextService],\n`;
  content += `  exports: [SystemContextService],\n`;
  content += `})\n`;
  content += `export class SystemContextModule {}\n`;

  await fs.writeFile(filePath, content);
}

/**
 * Helper function to capitalize the first letter of a string
 */
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

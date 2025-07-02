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
  await generateSystemContextModule(systemContextDir, systemFields);
}

/**
 * Generate a service for a specific system field
 */
async function generateFieldService(outputDir: string, field: string): Promise<void> {
  const className = `${capitalizeFirstLetter(field)}ContextService`;
  const fileName = `${field}-context.service.ts`;
  const filePath = path.join(outputDir, fileName);

  let content = `import { Injectable } from '@nestjs/common';\n\n`;
  content += `@Injectable()\n`;
  content += `export class ${className} {\n`;
  content += `  get${capitalizeFirstLetter(field)}(): any {\n`;
  content += `    return;\n`;
  content += `  }\n`;
  content += `}\n`;

  try {
    await fs.access(filePath);
    // File exists, don't overwrite it
  } catch (error) {
    // File doesn't exist, create it
    await fs.writeFile(filePath, content);
  }
}

/**
 * Generate SystemContextService
 */
async function generateSystemContextService(outputDir: string, systemFields: string[]): Promise<void> {
  // First, generate individual field services
  for (const field of systemFields) {
    await generateFieldService(outputDir, field);
  }

  // Then, generate the main context service
  const filePath = path.join(outputDir, 'system-context.service.ts');

  let imports = `import { Injectable } from '@nestjs/common';\n`;

  // Import all field services
  for (const field of systemFields) {
    const className = `${capitalizeFirstLetter(field)}ContextService`;
    imports += `import { ${className} } from './${field}-context.service';\n`;
  }
  imports += `\n`;

  let content = imports;
  content += `@Injectable()\n`;
  content += `export class SystemContextService {\n`;

  // Constructor with injected field services
  content += `  constructor(\n`;
  for (const field of systemFields) {
    const className = `${capitalizeFirstLetter(field)}ContextService`;
    const propertyName = `private readonly ${field}Service`;
    content += `    ${propertyName}: ${className},\n`;
  }
  content += `  ) {}\n\n`;

  // Generate methods for each system field that delegate to the field service
  for (const field of systemFields) {
    content += `  get${capitalizeFirstLetter(field)}(): any {\n`;
    content += `    return this.${field}Service.get${capitalizeFirstLetter(field)}();\n`;
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
async function generateSystemContextModule(outputDir: string, systemFields: string[] = []): Promise<void> {
  const filePath = path.join(outputDir, 'system-context.module.ts');

  let imports = `import { Module } from '@nestjs/common';\n`;
  imports += `import { SystemContextService } from './system-context.service';\n`;

  // Import all field services
  for (const field of systemFields) {
    const className = `${capitalizeFirstLetter(field)}ContextService`;
    imports += `import { ${className} } from './${field}-context.service';\n`;
  }
  imports += `\n`;

  let providers = `  providers: [SystemContextService`;
  let exports = `  exports: [SystemContextService`;

  // Add all field services to providers and exports
  for (const field of systemFields) {
    const className = `${capitalizeFirstLetter(field)}ContextService`;
    providers += `, ${className}`;
    exports += `, ${className}`;
  }

  providers += `],\n`;
  exports += `],\n`;

  let content = imports;
  content += `@Module({\n`;
  content += providers;
  content += exports;
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

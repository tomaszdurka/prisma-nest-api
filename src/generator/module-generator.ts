import { DMMF } from '@prisma/generator-helper';
import * as path from 'path';
import * as fs from 'fs/promises';
import { toKebabCase } from './utils/string-formatter';

interface GenerateModulesOptions {
  models: DMMF.Model[];
  outputDir: string;
}

/**
 * Generate NestJS module for each model
 */
export async function generateModules(options: GenerateModulesOptions): Promise<void> {
  const { models, outputDir } = options;
  
  // Generate individual module for each model
  for (const model of models) {
    await generateModelModule(model, outputDir);
    await generateModelIndexFile(model, outputDir);
  }
  
  // Generate index file for prisma module
  await generatePrismaIndexFile(outputDir);
  
  // Generate root module that imports all model modules
  await generateRootModule(models, outputDir);
}

/**
 * Generate a NestJS module file for a specific model
 */
async function generateModelModule(model: DMMF.Model, outputDir: string): Promise<void> {
  const modelName = model.name;
  const fileName = `${toKebabCase(modelName)}.module.ts`;
  const filePath = path.join(outputDir, toKebabCase(modelName), fileName);
  
  const controllerName = `${modelName}Controller`;
  
  let content = `import { Module } from '@nestjs/common';\n`;
  content += `import { ${controllerName} } from './${toKebabCase(modelName)}.controller';\n`;
  content += `import { PrismaModule } from '../prisma/prisma.module';\n\n`;
  
  content += `/**\n`;
  content += ` * NestJS module for ${modelName} entity\n`;
  content += ` */\n`;
  content += `@Module({\n`;
  content += `  controllers: [${controllerName}],\n`;
  content += `  imports: [PrismaModule],\n`;
  content += `})\n`;
  content += `export class ${modelName}Module {}\n`;
  
  await fs.writeFile(filePath, content);
}

/**
 * Generate an index file for a model that exports all relevant components
 */
async function generateModelIndexFile(model: DMMF.Model, outputDir: string): Promise<void> {
  const modelName = model.name;
  const indexPath = path.join(outputDir, toKebabCase(modelName), 'index.ts');
  
  let content = `// Export all components for ${modelName} module\n`;
  content += `export * from './${toKebabCase(modelName)}.controller';\n`;
  content += `export * from './${toKebabCase(modelName)}.module';\n`;
  content += `export * from './dto';\n`;
  
  await fs.writeFile(indexPath, content);
}

/**
 * Generate an index file for the Prisma module
 */
async function generatePrismaIndexFile(outputDir: string): Promise<void> {
  const fileName = 'index.ts';
  const filePath = path.join(outputDir, 'prisma', fileName);
  
  let content = `// Export all components from Prisma module
`;
  content += `export * from './prisma.module';
`;
  content += `export * from './prisma.service';
`;
  
  await fs.writeFile(filePath, content);
}

/**
 * Generate a root module that imports all model modules
 */
async function generateRootModule(models: DMMF.Model[], outputDir: string): Promise<void> {
  const fileName = 'app.module.ts';
  const filePath = path.join(outputDir, fileName);
  
  let imports = '';
  let modulesList = '';
  
  for (const model of models) {
    const modelName = model.name;
    imports += `import { ${modelName}Module } from './${toKebabCase(modelName)}';\n`;
    modulesList += `    ${modelName}Module,\n`;
  }
  
  let content = `import { Module } from '@nestjs/common';\n`;
  content += `import { PrismaModule } from './prisma';\n`;
  content += imports;
  content += `\n/**\n`;
  content += ` * Root module that imports all model modules\n`;
  content += ` */\n`;
  content += `@Module({\n`;
  content += `  imports: [\n`;
  content += `    PrismaModule,\n`;
  content += modulesList;
  content += `  ],\n`;
  content += `  exports: [\n`;
  content += modulesList;
  content += `  ],\n`;
  content += `})\n`;
  content += `export class AppModule {}\n`;
  
  await fs.writeFile(filePath, content);
}

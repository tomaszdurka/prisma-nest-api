import { DMMF } from '@prisma/generator-helper';
import * as path from 'path';
import * as fs from 'fs/promises';
import { toKebabCase } from './utils/string-formatter';

interface GenerateServicesOptions {
  models: DMMF.Model[];
  outputDir: string;
}

/**
 * Generate services for all models
 */
export async function generateServices(options: GenerateServicesOptions): Promise<void> {
  const { models, outputDir } = options;

  // Generate services for each model
  for (const model of models) {
    const modelOutputDir = path.join(outputDir, toKebabCase(model.name));
    await fs.mkdir(modelOutputDir, { recursive: true });
    await generateService(model, modelOutputDir);
  }
}

/**
 * Generate service for a model
 */
async function generateService(model: DMMF.Model, outputDir: string): Promise<void> {
  const modelName = model.name;
  const serviceName = `${modelName}Service`;
  const fileName = `${toKebabCase(modelName)}.service.ts`;
  const filePath = path.join(outputDir, fileName);

  let content = `import { Injectable, NotFoundException } from '@nestjs/common';\n`;
  content += `import { PrismaService } from '../prisma';\n`;
  content += `import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';\n`;
  content += `import {\n`;
  content += `  Create${modelName}Dto,\n`;
  content += `  Update${modelName}Dto,\n`;
  content += `  FindMany${modelName}Dto,\n`;
  content += `  ${modelName}IdDto,\n`;
  content += `} from './dto';\n\n`;

  content += `@Injectable()\n`;
  content += `export class ${serviceName} {\n`;
  content += `  constructor(private readonly prisma: PrismaService) {}\n\n`;

  // Find method
  content += generateFindMethod(model);

  // FindMany method
  content += generateFindManyMethod(model);

  // Count method
  content += generateCountMethod(model);

  // Create method
  content += generateCreateMethod(model);

  // Update method
  content += generateUpdateMethod(model);

  // Delete method
  content += generateDeleteMethod(model);

  content += `}\n`;

  await fs.writeFile(filePath, content);
}

/**
 * Helper function to convert a model name to camelCase for Prisma client
 * Example: OrderItem -> orderItem
 */
function toPrismaModelName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

/**
 * Helper function to get proper where clause for Prisma queries
 * @param model - The DMMF model
 * @param paramName - The name of the parameter containing the ID values (usually 'params')
 * @returns A string with the proper where clause code
 */
function getPrismaWhereClause(model: DMMF.Model, paramName: string): string {
  // Check if model has a composite primary key
  if (model.primaryKey && model.primaryKey.fields.length > 1) {
    // Generate the composite key name based on Prisma's convention
    const compositeKeyName = model.primaryKey.fields.join('_');

    // Return the object format with the composite key
    return `{ ${compositeKeyName}: ${paramName} }`;
  }

  // For single field primary keys, just use params directly
  return paramName;
}

/**
 * Generate find method
 */
function generateFindMethod(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);
  const whereClause = getPrismaWhereClause(model, 'params');

  let content = `  async find${modelName}(params: ${modelName}IdDto) {\n`;
  content += `    try {\n`;
  content += `      return await this.prisma.${prismaModelName}.findUniqueOrThrow({ where: ${whereClause} });\n`;
  content += `    } catch (error) {\n`;
  content += `      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {\n`;
  content += `        throw new NotFoundException('${modelName} record not found');\n`;
  content += `      }\n`;
  content += `      throw error;\n`;
  content += `    }\n`;
  content += `  }\n\n`;

  return content;
}

/**
 * Generate findMany method
 */
function generateFindManyMethod(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  let content = `  async findMany${modelName}(query: FindMany${modelName}Dto) {\n`;
  content += `    return this.prisma.${prismaModelName}.findMany(query);\n`;
  content += `  }\n\n`;

  return content;
}

/**
 * Generate count method
 */
function generateCountMethod(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  let content = `  async count${modelName}(query: Omit<FindMany${modelName}Dto, 'skip' | 'take' | 'cursor'>) {\n`;
  content += `    return this.prisma.${prismaModelName}.count(query);\n`;
  content += `  }\n\n`;

  return content;
}


/**
 * Generate create method
 */
function generateCreateMethod(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  let content = `  async create${modelName}(data: Create${modelName}Dto) {\n`;
  content += `    return this.prisma.${prismaModelName}.create({ data });\n`;
  content += `  }\n\n`;

  return content;
}

/**
 * Generate update method
 */
function generateUpdateMethod(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);
  const whereClause = getPrismaWhereClause(model, 'params');

  let content = `  async update${modelName}(params: ${modelName}IdDto, data: Update${modelName}Dto) {\n`;
  content += `    try {\n`;
  content += `      return await this.prisma.${prismaModelName}.update({ where: ${whereClause}, data });\n`;
  content += `    } catch (error) {\n`;
  content += `      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {\n`;
  content += `        throw new NotFoundException('${modelName} record not found');\n`;
  content += `      }\n`;
  content += `      throw error;\n`;
  content += `    }\n`;
  content += `  }\n\n`;

  return content;
}

/**
 * Generate delete method
 */
function generateDeleteMethod(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);
  const whereClause = getPrismaWhereClause(model, 'params');

  let content = `  async delete${modelName}(params: ${modelName}IdDto) {\n`;
  content += `    try {\n`;
  content += `      await this.prisma.${prismaModelName}.delete({ where: ${whereClause} });\n`;
  content += `    } catch (error) {\n`;
  content += `      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {\n`;
  content += `        throw new NotFoundException('${modelName} record not found');\n`;
  content += `      }\n`;
  content += `      throw error;\n`;
  content += `    }\n`;
  content += `  }\n\n`;

  return content;
}

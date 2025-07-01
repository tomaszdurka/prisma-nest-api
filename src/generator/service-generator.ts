import {DMMF} from '@prisma/generator-helper';
import * as path from 'path';
import * as fs from 'fs/promises';
import {toKebabCase} from './utils/string-formatter';
import {hasSystemFieldsInPrimaryKey} from "./model-generator/utils/helpers";

interface GenerateServicesOptions {
  models: DMMF.Model[];
  outputDir: string;
  systemFields?: string[];
}

/**
 * Generate services for all models
 */
export async function generateServices(options: GenerateServicesOptions): Promise<void> {
  const {models, outputDir, systemFields = []} = options;

  // Generate services for each model
  for (const model of models) {
    const modelOutputDir = path.join(outputDir, toKebabCase(model.name));
    await fs.mkdir(modelOutputDir, {recursive: true});
    await generateService(model, modelOutputDir, systemFields);
  }
}

/**
 * Generate service for a model
 */
async function generateService(model: DMMF.Model, outputDir: string, systemFields: string[] = []): Promise<void> {
  const modelName = model.name;
  const serviceName = `${modelName}Service`;
  const fileName = `${toKebabCase(modelName)}.service.ts`;
  const filePath = path.join(outputDir, fileName);
  const primaryKeyHasSystemFields = hasSystemFieldsInPrimaryKey(model, systemFields);

  let content = `import { Injectable, NotFoundException } from '@nestjs/common';\n`;
  content += `import { PrismaService } from '../prisma';\n`;
  if (primaryKeyHasSystemFields) {
    content += `import { SystemContextService } from '../system-context/system-context.service';\n`;
  }
  content += `import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';\n`;
  content += `import {\n`;
  content += `  Create${modelName}Dto,\n`;
  content += `  Update${modelName}Dto,\n`;
  content += `  FindMany${modelName}Dto,\n`;
  content += `  ${modelName}IdDto,\n`;
  content += `} from './dto';\n\n`;

  content += `@Injectable()\n`;
  content += `export class ${serviceName} {\n`;
  content += `  constructor(\n`;
  content += `    private readonly prisma: PrismaService,\n`;
  if (primaryKeyHasSystemFields) {
    content += `    private readonly systemContext: SystemContextService,\n`;
  }
  content += `  ) {}\n\n`;

  // Find method
  content += generateFindMethod(model, systemFields);

  // FindMany method
  content += generateFindManyMethod(model, systemFields);

  // Count method
  content += generateCountMethod(model, systemFields);

  // Create method
  content += generateCreateMethod(model, systemFields);

  // Update method
  content += generateUpdateMethod(model, systemFields);

  // Delete method
  content += generateDeleteMethod(model, systemFields);

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
 * Helper function to capitalize the first letter of a string
 */
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper function to get proper where clause for Prisma queries
 * @param model - The DMMF model
 * @param paramName - The name of the parameter containing the ID values (usually 'params')
 * @param systemFieldsInPrimaryKey - Array of system fields that are part of the primary key
 * @returns A string with the proper where clause code
 */
function getPrismaWhereClause(model: DMMF.Model, paramName: string, systemFieldsInPrimaryKey: string[] = []): string {

  const primaryKeyFields = model.primaryKey ? model.primaryKey.fields : []
  let whereClause = paramName;

  // If there are system fields in the primary key, we need to handle them specially
  if (systemFieldsInPrimaryKey.length > 0) {
    if (systemFieldsInPrimaryKey.length < primaryKeyFields.length) {
      whereClause = `{...${paramName}, ${systemFieldsInPrimaryKey.join(', ')}}`;
    } else {
      whereClause = `{${systemFieldsInPrimaryKey.join(', ')}}`;
    }
  }

  // Check if model has a composite primary key
  if (primaryKeyFields.length > 1) {
    const compositeKeyName = primaryKeyFields.join('_');
    whereClause = `{ ${compositeKeyName}: ${whereClause} }`;
  }

  return whereClause
}

/**
 * Generate find method
 */
function generateFindMethod(model: DMMF.Model, systemFields: string[] = []): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  // Check if any systemFields are part of the primary key
  const primaryKeyFields = model.primaryKey ? model.primaryKey.fields : [model.fields.find(f => f.isId)?.name].filter(Boolean);
  const systemFieldsInPrimaryKey = systemFields.filter(field => primaryKeyFields.includes(field));
  const whereClause = getPrismaWhereClause(model, 'params', systemFieldsInPrimaryKey);

  let content = `  async find${modelName}(params: ${modelName}IdDto) {\n`;

  // Only add system fields that are part of the primary key
  if (systemFieldsInPrimaryKey.length > 0) {
    // Add declarations for each system field in the primary key
    systemFieldsInPrimaryKey.forEach(field => {
      content += `    const ${field} = this.systemContext.get${capitalizeFirstLetter(field)}();\n`;
    });
  }

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
function generateFindManyMethod(model: DMMF.Model, systemFields: string[] = []): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  // Check if any systemFields are part of the primary key
  const primaryKeyFields = model.primaryKey ? model.primaryKey.fields : [model.fields.find(f => f.isId)?.name].filter(Boolean);
  const systemFieldsInPrimaryKey = systemFields.filter(field => primaryKeyFields.includes(field));

  // Get all field names from the model
  const modelFieldNames = model.fields.map(field => field.name);

  // Filter system fields that are actually part of the model
  const systemFieldsInModel = systemFields.filter(field => modelFieldNames.includes(field));

  // Generate the composite key name based on Prisma's convention
  const allPrimaryKeyFields = [...primaryKeyFields];

  // Add system fields to the primary key if they're not already included
  systemFieldsInPrimaryKey.forEach(field => {
    if (!allPrimaryKeyFields.includes(field)) {
      allPrimaryKeyFields.push(field);
    }
  });

  // Use destructuring in the method signature to separate cursor and where from the rest of the query
  let content = `  async findMany${modelName}({cursor, where, ...query}: FindMany${modelName}Dto) {\n`;

  // Only add system fields if they are part of the model
  if (systemFieldsInModel.length > 0) {
    // Add declarations for each system field in the model
    systemFieldsInModel.forEach(field => {
      content += `    const ${field} = this.systemContext.get${capitalizeFirstLetter(field)}();\n`;
    });

    // Use inline cursor and where handling with spread operator
    content += `    return this.prisma.${prismaModelName}.findMany({\n`;
    content += `      ...query,\n`;

    // Only add system fields to where if they are part of the model
    if (systemFieldsInModel.length > 0) {
      content += `      ...where && {where: {...where, ${systemFieldsInModel.join(', ')}}},\n`;
    } else {
      content += `      ...where && {where},\n`;
    }

    content += `      ...cursor && {cursor: ${getPrismaWhereClause(model, 'cursor', systemFieldsInModel)}}\n`;
    content += `    });\n`;
  } else {
    if (primaryKeyFields.length > 1) {
      content += `    return this.prisma.${prismaModelName}.findMany({...query, where, cursor: ${getPrismaWhereClause(model, 'cursor', systemFieldsInModel)}});\n`;
    } else {
      content += `    return this.prisma.${prismaModelName}.findMany({...query, where, cursor});\n`;
    }
  }

  content += `  }\n\n`;

  return content;
}

/**
 * Generate count method
 */
function generateCountMethod(model: DMMF.Model, systemFields: string[] = []): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  // Get all field names from the model
  const modelFieldNames = model.fields.map(field => field.name);

  // Filter system fields that are actually part of the model
  const systemFieldsInModel = systemFields.filter(field => modelFieldNames.includes(field));

  let content = `  async count${modelName}({where}: Pick<FindMany${modelName}Dto, 'where'>) {\n`;

  // Only add system fields if they are part of the model
  if (systemFieldsInModel.length > 0) {
    // Add declarations for each system field in the model
    systemFieldsInModel.forEach(field => {
      content += `    const ${field} = this.systemContext.get${capitalizeFirstLetter(field)}();\n`;
    });

    content += `    return this.prisma.${prismaModelName}.count({\n`;
    content += `      ...where && {where: {...where, ${systemFieldsInModel.join(', ')}}}\n`;
    content += `    });\n`;
  } else {
    content += `    return this.prisma.${prismaModelName}.count({where});\n`;
  }

  content += `  }\n\n`;

  return content;
}


/**
 * Generate create method
 */
function generateCreateMethod(model: DMMF.Model, systemFields: string[] = []): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  // Get all field names from the model
  const modelFieldNames = model.fields.map(field => field.name);

  // Filter system fields that are actually part of the model
  const systemFieldsInModel = systemFields.filter(field => modelFieldNames.includes(field));

  let content = `  async create${modelName}(data: Create${modelName}Dto) {\n`;

  // Only add system fields if they are part of the model
  if (systemFieldsInModel.length > 0) {
    // Add declarations for each system field in the model
    systemFieldsInModel.forEach(field => {
      content += `    const ${field} = this.systemContext.get${capitalizeFirstLetter(field)}();\n`;
    });

    // Create a new data object with system fields that are part of the model
    const systemFieldsSpread = systemFieldsInModel.map(field => `${field}`).join(', ');
    content += `    return this.prisma.${prismaModelName}.create({ data: {...data, ${systemFieldsSpread}} });\n`;
  } else {
    content += `    return this.prisma.${prismaModelName}.create({ data });\n`;
  }

  content += `  }\n\n`;

  return content;
}

/**
 * Generate update method
 */
function generateUpdateMethod(model: DMMF.Model, systemFields: string[] = []): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  // Get all field names from the model
  const modelFieldNames = model.fields.map(field => field.name);

  // Filter system fields that are actually part of the model
  const systemFieldsInModel = systemFields.filter(field => modelFieldNames.includes(field));

  // Check if any systemFields are part of the primary key
  const primaryKeyFields = model.primaryKey ? model.primaryKey.fields : [model.fields.find(f => f.isId)?.name].filter(Boolean);
  const systemFieldsInPrimaryKey = systemFields.filter(field => primaryKeyFields.includes(field));
  const whereClause = getPrismaWhereClause(model, 'params', systemFieldsInPrimaryKey);

  let content = `  async update${modelName}(params: ${modelName}IdDto, data: Update${modelName}Dto) {\n`;

  // Only add system fields if they are part of the model
  if (systemFieldsInModel.length > 0) {
    // Add declarations for each system field in the model
    systemFieldsInModel.forEach(field => {
      content += `    const ${field} = this.systemContext.get${capitalizeFirstLetter(field)}();\n`;
    });
  }

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
function generateDeleteMethod(model: DMMF.Model, systemFields: string[] = []): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  // Get all field names from the model
  const modelFieldNames = model.fields.map(field => field.name);

  // Filter system fields that are actually part of the model
  const systemFieldsInModel = systemFields.filter(field => modelFieldNames.includes(field));

  // Check if any systemFields are part of the primary key
  const primaryKeyFields = model.primaryKey ? model.primaryKey.fields : [model.fields.find(f => f.isId)?.name].filter(Boolean);
  const systemFieldsInPrimaryKey = systemFields.filter(field => primaryKeyFields.includes(field));
  const whereClause = getPrismaWhereClause(model, 'params', systemFieldsInPrimaryKey);

  let content = `  async delete${modelName}(params: ${modelName}IdDto) {\n`;

  // Only add system fields if they are part of the model
  if (systemFieldsInModel.length > 0) {
    // Add declarations for each system field in the model
    systemFieldsInModel.forEach(field => {
      content += `    const ${field} = this.systemContext.get${capitalizeFirstLetter(field)}();\n`;
    });
  }

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

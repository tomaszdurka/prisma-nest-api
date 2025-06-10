import { DMMF } from '@prisma/generator-helper';
import * as path from 'path';
import * as fs from 'fs/promises';
import { toKebabCase } from './utils/string-formatter';

interface GenerateControllersOptions {
  models: DMMF.Model[];
  outputDir: string;
  prismaClientProvider?: string;
}

/**
 * Generate CRUD controllers for all models
 */
export async function generateControllers(options: GenerateControllersOptions): Promise<void> {
  const { models, outputDir } = options;
  
  // Generate service directory for Prisma service
  await fs.mkdir(path.join(outputDir, 'prisma'), { recursive: true });

  // Generate Prisma service
  await generatePrismaService(outputDir);

  // Generate controllers for each model
  for (const model of models) {
    const modelOutputDir = path.join(outputDir, toKebabCase(model.name));
    await fs.mkdir(modelOutputDir, { recursive: true });
    await generateController(model, modelOutputDir);
  }
}

/**
 * Generate Prisma service for database access
 */
async function generatePrismaService(outputDir: string): Promise<void> {
  const fileName = 'prisma.service.ts';
  const filePath = path.join(outputDir, 'prisma', fileName);

  let content = `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';\n`;
  content += `import { PrismaClient } from '@prisma/client';\n\n`;

  content += `@Injectable()\n`;
  content += `export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {\n`;
  content += `  constructor() {\n`;
  content += `    super();\n`;
  content += `  }\n\n`;

  content += `  async onModuleInit() {\n`;
  content += `    await this.$connect();\n`;
  content += `  }\n\n`;

  content += `  async onModuleDestroy() {\n`;
  content += `    await this.$disconnect();\n`;
  content += `  }\n`;
  content += `}\n`;

  await fs.writeFile(filePath, content);
}

/**
 * Generate CRUD controller for a model
 */
async function generateController(model: DMMF.Model, outputDir: string): Promise<void> {
  const modelName = model.name;
  const controllerName = `${modelName}Controller`;
  const fileName = `${toKebabCase(modelName)}.controller.ts`;
  const filePath = path.join(outputDir, fileName);

  let content = `import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';\n`;
  content += `import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';\n`;
  content += `import { PrismaService } from '../prisma';\n`;
  content += `import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';\n`;
  content += `import {\n`;
  content += `  Create${modelName}Dto,\n`;
  content += `  Update${modelName}Dto,\n`;
  content += `  FindMany${modelName}Dto,\n`;
  content += `  FlatQuery${modelName}Dto,\n`;
  content += `  ${modelName}ResponseDto,\n`;
  content += `  ${modelName}IdDto,\n`;
  content += `} from './dto';\n\n`;

  content += `@ApiTags('${modelName}')\n`;
  content += `@Controller('${toKebabCase(modelName)}')\n`;
  content += `export class ${controllerName} {\n`;
  content += `  constructor(private readonly prisma: PrismaService) {}\n\n`;

  // Create endpoint
  content += generateCreateEndpoint(model);

  // Update endpoint
  content += generateUpdateEndpoint(model);

  // Find endpoint
  content += generateFindEndpoint(model);

  // FindMany endpoint with flat query
  content += generateFindManyEndpoint(model);

  // Search endpoint
  content += generateSearchEndpoint(model);

  // Delete endpoint
  content += generateDeleteEndpoint(model);

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
 * Helper function to get route path parameters for model primary key
 * For single primary key: ':id'
 * For composite primary key: ':field1/:field2'
 */
function getRouteParamPath(model: DMMF.Model): string {
  // Check if model has a composite primary key
  if (model.primaryKey && model.primaryKey.fields.length > 1) {
    return model.primaryKey.fields.map(field => `:${field}`).join('/');
  }
  
  // Default to ':id' for single field primary keys
  return ':id';
}

/**
 * Helper function to generate proper where clause for Prisma queries
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
 * Generate create endpoint
 */
function generateCreateEndpoint(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  let content = `  @Post()\n`;
  content += `  @ApiOperation({ summary: 'Create a new ${modelName} record', operationId: 'create${modelName}' })\n`;
  content += `  @ApiBody({ type: Create${modelName}Dto })\n`;
  content += `  @ApiResponse({ status: 201, description: 'Created ${modelName} record', type: ${modelName}ResponseDto })\n`;
  content += `  async create${modelName}(@Body() data: Create${modelName}Dto) {\n`;
  content += `    return this.prisma.${prismaModelName}.create({ data });\n`;
  content += `  }\n\n`;

  return content;
}

/**
 * Generate update endpoint
 */
function generateUpdateEndpoint(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  // Get route parameter path for this model's primary key
  const routePath = getRouteParamPath(model);
  // Get proper where clause format
  const whereClause = getPrismaWhereClause(model, 'params');
  
  let content = `  @Put('${routePath}')\n`;
  content += `  @ApiOperation({ summary: 'Update a ${modelName} record', operationId: 'update${modelName}' })\n`;
  content += `  @ApiBody({ type: Update${modelName}Dto })\n`;
  content += `  @ApiResponse({ status: 200, description: 'Updated ${modelName} record', type: ${modelName}ResponseDto })\n`;
  content += `  @ApiResponse({ status: 404, description: '${modelName} record not found' })\n`;
  content += `  async update${modelName}(@Param() params: ${modelName}IdDto, @Body() data: Update${modelName}Dto) {\n`;
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
 * Generate find endpoint
 */
function generateFindEndpoint(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  // Get route parameter path for this model's primary key
  const routePath = getRouteParamPath(model);
  // Get proper where clause format
  const whereClause = getPrismaWhereClause(model, 'params');

  let content = `  @Get('${routePath}')\n`;
  content += `  @ApiOperation({ summary: 'Get a ${modelName} record by ID', operationId: 'get${modelName}' })\n`;
  content += `  @ApiResponse({ status: 200, description: '${modelName} record', type: ${modelName}ResponseDto })\n`;
  content += `  @ApiResponse({ status: 404, description: '${modelName} record not found' })\n`;
  content += `  async get${modelName}(@Param() params: ${modelName}IdDto) {\n`;
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
 * Generate find many endpoint
 */
function generateFindManyEndpoint(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  let content = `  @Get()\n`;
  content += `  @ApiOperation({ summary: 'Get a list of ${modelName} records', operationId: 'get${modelName}List' })\n`;
  content += `  @ApiResponse({ status: 200, description: 'List of ${modelName} records', type: [${modelName}ResponseDto] })\n`;
  content += `  async get${modelName}List(@Query() query: FlatQuery${modelName}Dto) {\n`;
  content += `    return this.prisma.${prismaModelName}.findMany(query.toPrismaQuery());\n`;
  content += `  }\n\n`;

  return content;
}

/**
 * Generate search endpoint
 */
function generateSearchEndpoint(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  let content = `  @Post('search')\n`;
  content += `  @ApiOperation({ summary: 'Search ${modelName} records', operationId: 'search${modelName}' })\n`;
  content += `  @ApiBody({ type: FindMany${modelName}Dto })\n`;
  content += `  @ApiResponse({ status: 200, description: 'List of ${modelName} records', type: [${modelName}ResponseDto] })\n`;
  content += `  async search${modelName}(@Body() query: FindMany${modelName}Dto) {\n`;
  content += `    const { where, orderBy, take, skip } = query;\n`;
  content += `    return this.prisma.${prismaModelName}.findMany({\n`;
  content += `      where,\n`;
  content += `      orderBy,\n`;
  content += `      take,\n`;
  content += `      skip,\n`;
  content += `    });\n`;
  content += `  }\n\n`;

  return content;
}

/**
 * Generate delete endpoint
 */
function generateDeleteEndpoint(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  // Get route parameter path for this model's primary key
  const routePath = getRouteParamPath(model);
  // Get proper where clause format
  const whereClause = getPrismaWhereClause(model, 'params');

  let content = `  @Delete('${routePath}')\n`;
  content += `  @ApiOperation({ summary: 'Delete a ${modelName} record', operationId: 'delete${modelName}' })\n`;
  content += `  @HttpCode(HttpStatus.NO_CONTENT)\n`;
  content += `  @ApiResponse({ status: 204, description: '${modelName} record deleted' })\n`;
  content += `  @ApiResponse({ status: 404, description: '${modelName} record not found' })\n`;
  content += `  async delete${modelName}(@Param() params: ${modelName}IdDto) {\n`;
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

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

  // Generate controllers for each model
  for (const model of models) {
    const modelOutputDir = path.join(outputDir, toKebabCase(model.name));
    await fs.mkdir(modelOutputDir, { recursive: true });
    await generateController(model, modelOutputDir);
  }
}

/**
 * Generate CRUD controller for a model
 */
async function generateController(model: DMMF.Model, outputDir: string): Promise<void> {
  const modelName = model.name;
  const controllerName = `${modelName}Controller`;
  const fileName = `${toKebabCase(modelName)}.controller.ts`;
  const filePath = path.join(outputDir, fileName);

  let content = `import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';\n`;
  content += `import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';\n`;
  content += `import { ${modelName}Service } from './${toKebabCase(modelName)}.service';\n`;
  content += `import {\n`;
  content += `  Create${modelName}Dto,\n`;
  content += `  Update${modelName}Dto,\n`;
  content += `  FindMany${modelName}Dto,\n`;
  content += `  FlatQuery${modelName}Dto,\n`;
  content += `  ${modelName}ListDto,\n`;
  content += `  ${modelName}Dto,\n`;
  content += `  ${modelName}IdDto,\n`;
  content += `} from './dto';\n\n`;

  content += `@ApiTags('${modelName}')\n`;
  content += `@Controller('${toKebabCase(modelName)}')\n`;
  content += `export class ${controllerName} {\n`;
  content += `  constructor(private readonly ${toPrismaModelName(modelName)}Service: ${modelName}Service) {}\n\n`;

  // Find endpoint
  content += generateFindEndpoint(model);

  // FindMany endpoint with flat query
  content += generateFindManyEndpoint(model);

  // Search endpoint
  content += generateSearchEndpoint(model);

  // Create endpoint
  content += generateCreateEndpoint(model);

  // Update endpoint
  content += generateUpdateEndpoint(model);

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
 * Generate create endpoint
 */
function generateCreateEndpoint(model: DMMF.Model): string {
  const modelName = model.name;
  const prismaModelName = toPrismaModelName(modelName);

  let content = `  @Post()\n`;
  content += `  @ApiOperation({ summary: 'Create a new ${modelName} record', operationId: 'create${modelName}' })\n`;
  content += `  @ApiBody({ type: Create${modelName}Dto })\n`;
  content += `  @ApiResponse({ status: 201, description: 'Created ${modelName} record', type: ${modelName}Dto })\n`;
  content += `  async create${modelName}(@Body() data: Create${modelName}Dto) {\n`;
  content += `    return this.${prismaModelName}Service.create${modelName}(data);\n`;
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

  let content = `  @Put('${routePath}')\n`;
  content += `  @ApiOperation({ summary: 'Update a ${modelName} record', operationId: 'update${modelName}' })\n`;
  content += `  @ApiBody({ type: Update${modelName}Dto })\n`;
  content += `  @ApiResponse({ status: 200, description: 'Updated ${modelName} record', type: ${modelName}Dto })\n`;
  content += `  @ApiResponse({ status: 404, description: '${modelName} record not found' })\n`;
  content += `  async update${modelName}(@Param() params: ${modelName}IdDto, @Body() data: Update${modelName}Dto) {\n`;
  content += `    return this.${prismaModelName}Service.update${modelName}(params, data);\n`;
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

  let content = `  @Get('${routePath}')\n`;
  content += `  @ApiOperation({ summary: 'Get a ${modelName} record by ID', operationId: 'get${modelName}' })\n`;
  content += `  @ApiResponse({ status: 200, description: '${modelName} record', type: ${modelName}Dto })\n`;
  content += `  @ApiResponse({ status: 404, description: '${modelName} record not found' })\n`;
  content += `  async get${modelName}(@Param() params: ${modelName}IdDto) {\n`;
  content += `    return this.${prismaModelName}Service.find${modelName}(params);\n`;
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
  content += `  @ApiResponse({ status: 200, description: 'List of ${modelName} records', type: ${modelName}ListDto })\n`;
  content += `  async get${modelName}List(@Query() flatQuery: FlatQuery${modelName}Dto) {\n`;
  content += `    const query = flatQuery.toQuery();\n`;
  content += `    const {cursor, skip, take, ...countQuery} = query;\n`;
  content += `    const [items, total] = await Promise.all([\n`;
  content += `      this.${prismaModelName}Service.findMany${modelName}(query),\n`;
  content += `      this.${prismaModelName}Service.count${modelName}(countQuery),\n`;
  content += `    ]);\n`;
  content += `    return {items, total};\n`;
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
  content += `  @ApiResponse({ status: 200, description: 'List of ${modelName} records', type: ${modelName}ListDto })\n`;
  content += `  async search${modelName}(@Body() query: FindMany${modelName}Dto) {\n`;
  content += `    const {cursor, skip, take, ...countQuery} = query;\n`;
  content += `    const [items, total] = await Promise.all([\n`;
  content += `      this.${prismaModelName}Service.findMany${modelName}(query),\n`;
  content += `      this.${prismaModelName}Service.count${modelName}(countQuery),\n`;
  content += `    ]);\n`;
  content += `    return {items, total};\n`;
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

  let content = `  @Delete('${routePath}')\n`;
  content += `  @ApiOperation({ summary: 'Delete a ${modelName} record', operationId: 'delete${modelName}' })\n`;
  content += `  @HttpCode(HttpStatus.NO_CONTENT)\n`;
  content += `  @ApiResponse({ status: 204, description: '${modelName} record deleted' })\n`;
  content += `  @ApiResponse({ status: 404, description: '${modelName} record not found' })\n`;
  content += `  async delete${modelName}(@Param() params: ${modelName}IdDto) {\n`;
  content += `    await this.${prismaModelName}Service.delete${modelName}(params);\n`;
  content += `  }\n\n`;

  return content;
}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Prisma generator that automatically creates a complete NestJS API from Prisma schemas. It generates controllers, services, DTOs, and modules for all Prisma models with zero runtime dependencies by copying utility files locally.

## Core Architecture

The generator follows a modular architecture with distinct responsibilities:

- **Generator Entry Point** (`src/generator/index.ts`): Main handler that orchestrates the generation process
- **Controller Generator** (`src/generator/controller-generator.ts`): Creates REST API controllers with CRUD operations
- **Service Generator** (`src/generator/service-generator.ts`): Generates service classes for database operations
- **Model Generator** (`src/generator/model-generator/`): Creates DTOs for different operations (Create, Update, Response, Filter, etc.)
- **Module Generator** (`src/generator/module-generator.ts`): Generates NestJS modules that wire everything together
- **Utility Copier** (`src/generator/utils-copier.ts`): Copies library utilities to output directory for zero dependencies

### Key Generation Flow

1. Copy utility files from `assets/lib/` to ensure zero runtime dependencies
2. Generate Prisma module and SystemContext service
3. Generate model DTOs with proper transformations and validations
4. Generate services with CRUD operations and error handling
5. Generate controllers with REST endpoints and Swagger documentation
6. Generate modules to wire controllers and services together

### System Fields Support

The generator supports "system fields" (configurable fields like `tenantId`, `userId`) that are automatically injected into operations through the SystemContextService.

## Development Commands

### Build Commands
- `npm run build` - Build main TypeScript files
- `npm run build:generator` - Build generator-specific files  
- `npm run build:all` - Build everything (runs both build commands)
- `npm run prepare` - Runs build:all automatically before publishing

### Testing
- `npm test` - Currently shows error (no tests configured)

### Development Workflow
1. Make changes to generator code in `src/generator/`
2. Run `npm run build:generator` to compile
3. Test with a Prisma project using `npx prisma generate`

## File Organization

- `src/generator/` - Main generator logic
- `assets/lib/` - Utility files copied to generated output (filters, pagination, decorators)
- `dist/` - Compiled output
- TypeScript configs:
  - `tsconfig.json` - Main TypeScript configuration
  - `tsconfig.generator.json` - Generator-specific build configuration

## Generator Configuration

The generator is configured in `schema.prisma`:
```prisma
generator nestjs_api {
  provider = "prisma-nest-api"
  output   = "../src/generated"
  systemFields = ["tenantId", "userId"] // Optional
}
```

## Generated API Structure

For each Prisma model, the generator creates:
- REST endpoints: GET, POST, PUT, DELETE with proper error handling
- Two query interfaces: Simple flat parameters (GET) and complex nested queries (POST /search)
- Type-safe DTOs with field-specific filter operations
- Swagger documentation for all endpoints
- Services with proper 404 handling when records aren't found

## Important Notes

- **Index File Protection**: The generator checks for existing index.ts files before overwriting them. This applies to:
  - Model DTO index files (`dto/index.ts`)
  - Model module index files
  - System context index files
  - Prisma module index files
- Custom modifications to index files will be preserved across regenerations
# Prisma-NestJS API Generator

A powerful code generator that automatically creates a fully-featured NestJS API from your Prisma schema, with zero runtime dependencies.

## Features

- **Complete API Generation**: Creates controllers, DTOs, and services for all your Prisma models
- **Zero Runtime Dependencies**: All utility files are copied locally to the generated code
- **Type-Safe Filtering**: Filter operations with proper type checking and validations
- **Flat Query Parameters**: Simplified API querying with field-specific operators:
    - ID fields: Only the `equals` operator
    - String fields: Only the `equals` operator
    - Number fields: Only `equals`, `gte`, `lte` operators
    - Date fields: Only `gte`, `lte` operators
    - Boolean fields: Only the `equals` operator
- **Standardized API Endpoints**:
    - GET /{model} - Uses simplified flat query parameters
    - POST /{model}/search - Uses full nested query capabilities
- **Proper Error Handling**: Automatic 404 responses when records aren't found
- **Type-Specific Transformations**: Automatically converts string input to proper types
- **Well-Documented API**: Full Swagger annotations on all endpoints and parameters

## Installation

```bash
npm install prisma-nest-api --save-dev
```

## Setup

Add the generator to your `schema.prisma` file:

```prisma
generator nestjs_api {
  provider = "prisma-nest-api"
  output   = "../src/generated" // Customize output path as needed
}

generator client {
  provider = "prisma-client-js"
}

// Your models here...
```

## Usage

### 1. Generate the API

```bash
npx prisma generate
```

This will create controllers, DTOs, and service files in your specified output directory.

### 2. Import in your NestJS application

In your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UserController } from './generated/controllers/user.controller';
// Import other controllers as needed

@Module({
  controllers: [
    UserController,
    // Other controllers...
  ],
  providers: [
    PrismaService,
    // Any other providers...
  ],
})
export class AppModule {}
```

### 3. Create a PrismaService

```typescript
// src/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

## How It Works

The generator analyzes your Prisma schema and generates:

1. **DTO Classes**:
    - CreateDto: For creating new records
    - UpdateDto: For updating existing records
    - ResponseDto: For returning data
    - IdDto: For route parameters using primary keys
    - FilterDto: For searching and filtering

2. **Controllers**:
    - Standard REST endpoints (GET, POST, PUT, DELETE)
    - Search endpoints with advanced filtering
    - Proper error handling with 404 responses

3. **Transformations**:
    - String-to-number conversions for numeric fields
    - String-to-date conversions for date fields
    - String-to-boolean conversions for boolean fields

All utility files needed for the generated code are copied to your output directory, ensuring the generated API has no runtime dependencies on the library.

## API Endpoints

For each model (e.g., `User`), the following endpoints are generated:

- `GET /user` - List users with optional filtering
- `GET /user/:id` - Get a specific user by ID
- `POST /user` - Create a new user
- `PUT /user/:id` - Update a user
- `DELETE /user/:id` - Delete a user
- `POST /user/search` - Advanced search with complex filtering

## Filtering Examples

### Basic Filtering (GET /user)

```
GET /user?name=John&age_gte=18&age_lte=65
```

This translates to: "Get all users named John with age between 18 and 65"

### Advanced Filtering (POST /user/search)

```json
POST /user/search
{
  "where": {
    "name": {
      "equals": "John"
    },
    "age": {
      "gte": 18,
      "lte": 65
    },
    "orders": {
      "some": {
        "status": {
          "equals": "DELIVERED"
        }
      }
    }
  },
  "take": 10,
  "skip": 0
}
```

## Customization

The generator supports various customization options:

- Change the output directory in your `schema.prisma`
- Customize the Prisma client provider
- Add additional validation rules to your schema

## License

MIT

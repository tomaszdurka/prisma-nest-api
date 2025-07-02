import * as path from 'path';
import * as fs from 'fs/promises';

interface GeneratePrismaModuleOptions {
  outputDir: string;
}

/**
 * Generate dedicated Prisma module with Prisma service
 */
export async function generatePrismaModule(options: GeneratePrismaModuleOptions): Promise<void> {
  const { outputDir } = options;

  // Generate Prisma module
  await generatePrismaModuleFile(outputDir);

  // Generate updated Prisma service with proper imports/exports
  await generatePrismaServiceFile(outputDir);
}

/**
 * Generate a dedicated Prisma module file
 */
async function generatePrismaModuleFile(outputDir: string): Promise<void> {
  await fs.mkdir(path.join(outputDir, 'prisma'), { recursive: true });
  const fileName = 'prisma.module.ts';
  const filePath = path.join(outputDir, 'prisma', fileName);

  let content = `import { Module, Global } from '@nestjs/common';\n`;
  content += `import { PrismaService } from './prisma.service';\n\n`;
  content += `@Module({\n`;
  content += `  providers: [PrismaService],\n`;
  content += `  exports: [PrismaService],\n`;
  content += `})\n`;
  content += `export class PrismaModule {}\n`;

  await fs.writeFile(filePath, content);
}

/**
 * Generate an updated Prisma service file
 */
async function generatePrismaServiceFile(outputDir: string): Promise<void> {
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

  try {
    await fs.access(filePath);
    // File exists, don't overwrite it
  } catch (error) {
    // File doesn't exist, create it
    await fs.writeFile(filePath, content);
  }
}

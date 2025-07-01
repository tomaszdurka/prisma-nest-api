#!/usr/bin/env node

import {generatorHandler, GeneratorOptions, DMMF} from '@prisma/generator-helper';
import {generateModels} from './model-generator';
import {generateControllers} from './controller-generator';
import {generateServices} from './service-generator';
import {copyUtilities} from './utils-copier';
import {generateModules} from "./module-generator";
import {generatePrismaModule} from "./prisma-module-generator";
import {generateSystemContext} from "./system-context-generator";

// Main generator handler
generatorHandler({
  onManifest() {
    return {
      version: '1.5.1',
      defaultOutput: 'src/generated', 
      prettyName: 'NestJS API Generator',
    };
  },
  async onGenerate(options: GeneratorOptions) {
    // Get the output directory, defaulting to src/generated if not specified
    const outputDir = options.generator.output?.value || 'src/generated';

    // Get systemFields option, defaulting to empty array if not specified
    const systemFields = options.generator.config.systemFields
      ? (Array.isArray(options.generator.config.systemFields)
          ? options.generator.config.systemFields
          : [options.generator.config.systemFields])
      : [];

    // Use type assertion to handle the readonly types
    const models = options.dmmf.datamodel.models as unknown as DMMF.Model[];
    const enums = options.dmmf.datamodel.enums as unknown as DMMF.DatamodelEnum[];

    console.log(`Generating NestJS API in: ${outputDir}`);

    // Copy utility files from the library to the output directory
    // This ensures the generated code doesn't have runtime dependencies on the library
    await copyUtilities(outputDir);

    // Generate Prisma module with Prisma service
    await generatePrismaModule({
      outputDir,
    });

    // Generate SystemContext service and module
    await generateSystemContext({
      outputDir,
      systemFields,
    });

    // Generate model DTOs for create, update, findUnique, findMany operations
    await generateModels({
      models,
      outputDir,
      enums,
      systemFields,
    });

    // Generate services for CRUD operations
    await generateServices({
      models,
      outputDir,
      systemFields,
    });

    // Generate controllers for CRUD operations
    await generateControllers({
      models,
      outputDir,
    });

    await generateModules({
      models,
      outputDir,
    });


    console.log('✅ NestJS API models and controllers generated successfully!');
  },
});

#!/usr/bin/env node

import {generatorHandler, GeneratorOptions, DMMF} from '@prisma/generator-helper';
import {generateModels} from './model-generator';
import {generateControllers} from './controller-generator';
import {copyUtilities} from './utils-copier';
import {generateModules} from "./module-generator";
import {generatePrismaModule} from "./prisma-module-generator";

// Main generator handler
generatorHandler({
  onManifest() {
    return {
      version: '1.1.6',
      defaultOutput: 'src/generated', 
      prettyName: 'NestJS API Generator',
    };
  },
  async onGenerate(options: GeneratorOptions) {
    // Get the output directory, defaulting to src/generated if not specified
    const outputDir = options.generator.output?.value || 'src/generated';

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

    // Generate model DTOs for create, update, findUnique, findMany operations
    await generateModels({
      models,
      outputDir,
      enums,
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

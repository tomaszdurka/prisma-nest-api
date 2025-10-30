#!/usr/bin/env node

import {generatorHandler, GeneratorOptions, DMMF} from '@prisma/generator-helper';
import {generateModels} from './model-generator';
import {generateControllers} from './controller-generator';
import {generateServices} from './service-generator';
import {copyUtilities} from './utils-copier';
import {generateModules} from "./module-generator";
import {generatePrismaModule} from "./prisma-module-generator";
import {generateSystemContext} from "./system-context-generator";
import {generateEnumFilters} from "./enum-filters-generator";

// Main generator handler
generatorHandler({
  onManifest() {
    return {
      version: '1.11.3',
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

    // Get schemas option, defaulting to undefined if not specified
    const allowedSchemas = options.generator.config.schemas
      ? (Array.isArray(options.generator.config.schemas)
          ? options.generator.config.schemas
          : [options.generator.config.schemas])
      : undefined;

    // Use type assertion to handle the readonly types
    let models = options.dmmf.datamodel.models as unknown as DMMF.Model[];

    // Filter models by schema if schemas config is provided
    if (allowedSchemas && allowedSchemas.length > 0) {
      models = models.filter(model => {
        const modelSchema = model.schema || 'public'; // Default to 'public' if no schema is specified
        return allowedSchemas.includes(modelSchema);
      });
      console.log(`Filtering models by schemas: ${allowedSchemas.join(', ')}`);
      console.log(`${models.length} models match the specified schemas`);
    }

    const enums = options.dmmf.datamodel.enums as unknown as DMMF.DatamodelEnum[];

    // Note: Enums are not filtered by schema as they may be used by models in allowed schemas

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

    // Generate all enum filters in a central location
    await generateEnumFilters({
      enums,
      outputDir,
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
      systemFields,
    });

    await generateModules({
      models,
      outputDir,
    });


    console.log('✅ NestJS API models and controllers generated successfully!');
  },
});

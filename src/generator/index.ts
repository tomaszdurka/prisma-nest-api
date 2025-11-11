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
      version: '1.14.0',
      defaultOutput: 'src/generated',
      prettyName: 'NestJS API Generator',
    };
  },
  async onGenerate(options: GeneratorOptions) {
    // Get the output directory, defaulting to src/generated if not specified
    const outputDir = options.generator.output?.value || 'src/generated';
    const generatorName = options.generator.name;

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

    // Get models option, defaulting to undefined if not specified
    const allowedModels = options.generator.config.models
      ? (Array.isArray(options.generator.config.models)
          ? options.generator.config.models
          : [options.generator.config.models])
      : undefined;

    // Get ignoreSchemas option, defaulting to undefined if not specified
    const ignoredSchemas = options.generator.config.ignoreSchemas
      ? (Array.isArray(options.generator.config.ignoreSchemas)
          ? options.generator.config.ignoreSchemas
          : [options.generator.config.ignoreSchemas])
      : undefined;

    // Get ignoreModels option, defaulting to undefined if not specified
    const ignoredModels = options.generator.config.ignoreModels
      ? (Array.isArray(options.generator.config.ignoreModels)
          ? options.generator.config.ignoreModels
          : [options.generator.config.ignoreModels])
      : undefined;

    // Use type assertion to handle the readonly types
    let models = options.dmmf.datamodel.models as unknown as DMMF.Model[];
    const totalModels = models.length;

    console.log(`\nGenerating NestJS API for '${generatorName}'`);

    // Log active filters
    if (allowedSchemas || ignoredSchemas || allowedModels || ignoredModels) {
      console.log(`\nActive filters for '${generatorName}':`);
    }
    if (allowedSchemas) {
      console.log(`- Include schemas: ${allowedSchemas.join(', ')}`);
    }
    if (ignoredSchemas) {
      console.log(`- Ignore schemas: ${ignoredSchemas.join(', ')}`);
    }
    if (allowedModels) {
      console.log(`- Include models: ${allowedModels.join(', ')}`);
    }
    if (ignoredModels) {
      console.log(`- Ignore models: ${ignoredModels.join(', ')}`);
    }
    if (!allowedSchemas && !ignoredSchemas && !allowedModels && !ignoredModels) {
      console.log(`No filters (generating all models)`);
    }

    // Apply all filters in a single pass
    models = models.filter(model => {
      const modelSchema = model.schema;
      const modelName = model.name;

      // Check schema inclusion filter
      if (allowedSchemas) {
        if (!modelSchema || !allowedSchemas.includes(modelSchema)) {
          return false;
        }
      }

      // Check schema exclusion filter
      if (ignoredSchemas) {
        if (modelSchema && ignoredSchemas.includes(modelSchema)) {
          return false;
        }
      }

      // Check model inclusion filter
      if (allowedModels) {
        if (!allowedModels.includes(modelName)) {
          return false;
        }
      }

      // Check model exclusion filter
      if (ignoredModels) {
        if (ignoredModels.includes(modelName)) {
          return false;
        }
      }

      return true;
    });

    const enums = options.dmmf.datamodel.enums as unknown as DMMF.DatamodelEnum[];

    // Note: Enums are not filtered by schema as they may be used by models in allowed schemas



    console.log(`Total models in schema: ${totalModels}`);
    console.log(`- Models to generate: ${models.length}`);
    console.log(`- Models skipped: ${totalModels - models.length}`);


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


    console.log(`✅ Generated successfully in '${outputDir}'}`);
  },
});

import * as fs from 'fs/promises';
import * as path from 'path';
import {GenerateModelsOptions} from './utils/types';
import {preprocessModels} from './utils/model-processor';

// Import all the DTO generators
import {generateCreateDto} from './dtos/create-dto';
import {generateUpdateDto} from './dtos/update-dto';
import {generateDto} from './dtos/response-dto';
import {generateIdDto} from './dtos/id-dto';
import {generateFindManyDto} from './dtos/find-many-dto';
import {generateFlatQueryDto} from './dtos/flat-query-dto';
import {generateModelIndexFile} from './dtos/index-generator';

// Import the filter generator
import {generateFilterClass} from './filters/filter-generator';
import {toKebabCase} from "../utils/string-formatter";

/**
 * Generate model DTOs for various operations (create, update, find, etc)
 */
export async function generateModels(options: GenerateModelsOptions): Promise<void> {
  const {models, outputDir, enums = [], systemFields = []} = options;
  const enhancedModels = preprocessModels(models);

  // Create base directories
  // await fs.mkdir(path.join(outputDir, 'dto'), { recursive: true });
  // await fs.mkdir(path.join(outputDir, 'controllers'), { recursive: true });
  // await fs.mkdir(path.join(outputDir, 'services'), { recursive: true });

  // Process each model and generate all required files
  for (const model of enhancedModels) {
    // Create model-specific directory for DTOs
    const modelDtoDir = path.join(outputDir, toKebabCase(model.name));
    await fs.mkdir(modelDtoDir, {recursive: true});

    // Generate all DTOs for this model
    await generateCreateDto(model, modelDtoDir, enums, systemFields);
    await generateUpdateDto(model, modelDtoDir, enums, systemFields);
    await generateDto(model, modelDtoDir, enums);
    await generateIdDto(model, modelDtoDir, enums, systemFields);
    await generateFindManyDto(model, modelDtoDir);
    await generateFlatQueryDto(model, modelDtoDir);
    await generateFilterClass(model, modelDtoDir, systemFields);

    // Generate index file for this model's DTOs
    await generateModelIndexFile(model, modelDtoDir);
  }
}

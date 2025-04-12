import * as fs from 'fs/promises';
import * as path from 'path';
import { GenerateModelsOptions } from './utils/types';
import { preprocessModels } from './utils/model-processor';

// Import all the DTO generators
import { generateCreateDto } from './dtos/create-dto';
import { generateUpdateDto } from './dtos/update-dto';
import { generateResponseDto } from './dtos/response-dto';
import { generateIdDto } from './dtos/id-dto';
import { generateFindManyDto } from './dtos/find-many-dto';
import { generateFlatQueryDto } from './dtos/flat-query-dto';
import { generateModelIndexFile } from './dtos/index-generator';

// Import the filter generator
import { generateFilterClass } from './filters/filter-generator';

/**
 * Generate model DTOs for various operations (create, update, find, etc)
 */
export async function generateModels(options: GenerateModelsOptions): Promise<void> {
  const { models, outputDir, enums = [], prismaClientProvider = '@prisma/client' } = options;
  const enhancedModels = preprocessModels(models);
  
  // Create base directories
  await fs.mkdir(path.join(outputDir, 'dto'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'controllers'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'services'), { recursive: true });
  
  // Process each model and generate all required files
  for (const model of enhancedModels) {
    // Create model-specific directory for DTOs
    const modelDtoDir = path.join(outputDir, 'dto', model.name.toLowerCase());
    await fs.mkdir(modelDtoDir, { recursive: true });
    
    // Generate all DTOs for this model
    await generateCreateDto(model, outputDir, enums, prismaClientProvider);
    await generateUpdateDto(model, outputDir, enums, prismaClientProvider);
    await generateResponseDto(model, outputDir, enums, prismaClientProvider);
    await generateIdDto(model, outputDir, enums, prismaClientProvider);
    await generateFindManyDto(model, outputDir);
    await generateFlatQueryDto(model, outputDir);
    await generateFilterClass(model, outputDir);
    
    // Generate index file for this model's DTOs
    await generateModelIndexFile(model, outputDir);
  }
}

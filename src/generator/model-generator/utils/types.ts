import { DMMF } from '@prisma/generator-helper';

export interface GenerateModelsOptions {
  models: DMMF.Model[];
  outputDir: string;
  enums?: DMMF.DatamodelEnum[];
  prismaClientProvider?: string;
}

export interface EnhancedModel extends DMMF.Model {
  _foreignKeys?: Set<string>;
  _relationFields?: Map<string, {
    relationFields: string[];
    isReadOnly: boolean;
  }>;
}

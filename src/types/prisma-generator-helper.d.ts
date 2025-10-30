import { GeneratorConfig as OriginalGeneratorConfig } from '@prisma/generator-helper';

declare module '@prisma/generator-helper' {
  interface GeneratorConfig extends OriginalGeneratorConfig {
    systemFields?: {
      value: string | string[];
    };
    schemas?: {
      value: string | string[];
    };
    models?: {
      value: string | string[];
    };
    ignoreSchemas?: {
      value: string | string[];
    };
    ignoreModels?: {
      value: string | string[];
    };
  }
}

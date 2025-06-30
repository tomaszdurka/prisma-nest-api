import { GeneratorConfig as OriginalGeneratorConfig } from '@prisma/generator-helper';

declare module '@prisma/generator-helper' {
  interface GeneratorConfig extends OriginalGeneratorConfig {
    systemFields?: {
      value: string | string[];
    };
  }
}

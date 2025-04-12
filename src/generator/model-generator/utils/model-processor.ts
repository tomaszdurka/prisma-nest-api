import {DMMF} from "@prisma/generator-helper";
import {EnhancedModel} from "../utils/types";

/**
 * Process and enhance model data for better generation
 */
export function preprocessModels(models: DMMF.Model[]): EnhancedModel[] {
  // Create a deep copy of models to avoid mutating the original
  const processedModels = JSON.parse(JSON.stringify(models)) as EnhancedModel[];

  // First pass: identify relation fields and their properties
  const relationMap = new Map<string, Map<string, Set<string>>>();

  for (const model of processedModels) {
    if (!relationMap.has(model.name)) {
      relationMap.set(model.name, new Map<string, Set<string>>());
    }

    // Find relation fields
    for (const field of model.fields) {
      if (field.relationName && field.relationFromFields) {
        const modelRelations = relationMap.get(model.name)!;

        // Track foreign key fields used in this relation
        for (const fromField of field.relationFromFields) {
          if (!modelRelations.has(fromField)) {
            modelRelations.set(fromField, new Set<string>());
          }
          // Add relation field name to the set
          modelRelations.get(fromField)!.add(field.name);
        }
      }
    }
  }

  // Second pass: enhance models with relation metadata
  for (const model of processedModels) {
    // Create a map to track foreign key fields
    model._foreignKeys = new Set<string>();
    model._relationFields = new Map<string, {
      relationFields: string[];
      isReadOnly: boolean;
    }>();

    // Find foreign key fields by looking at relations
    for (const field of model.fields) {
      if (field.relationName && field.relationFromFields) {
        // This field is a relation with foreign keys
        for (const foreignKeyName of field.relationFromFields) {
          // Mark this field as a foreign key
          model._foreignKeys.add(foreignKeyName);

          // Store relation info for this foreign key
          if (!model._relationFields.has(foreignKeyName)) {
            model._relationFields.set(foreignKeyName, {
              relationFields: [],
              isReadOnly: field.isReadOnly || false
            });
          }
          model._relationFields.get(foreignKeyName)!.relationFields.push(field.name);
        }
      }
    }
  }

  return processedModels;
}

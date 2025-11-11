import {DMMF} from '@prisma/generator-helper';
import {EnhancedModel} from './types';

/**
 * Helper function to check if a field is a foreign key
 */
export function isForeignKey(field: DMMF.Field, model: EnhancedModel): boolean {
  if (!field.relationName) return false;
  if (!model._foreignKeys) return false;
  return model._foreignKeys.has(field.name);
}

export function getPrimaryKeyFields(model: EnhancedModel) {
  return model.fields.filter(field => {
    // Check for single-field primary key
    if (field.isId) {
      return true;
    }

    // Check for composite primary key using @@id directive
    if (model.primaryKey && model.primaryKey.fields.includes(field.name)) {
      return true;
    }

    return false;
  }).map(field => field.name);
}

export function hasSystemFieldsInPrimaryKey(model: EnhancedModel, systemFields: string[]) {
  return getPrimaryKeyFields(model).some(field => systemFields.includes(field))
}

/**
 * Helper function to determine if a field should be included in Create/Update DTOs
 */
export function shouldIncludeFieldInDto(field: DMMF.Field, model: EnhancedModel, forUpdate: boolean = false): boolean {
  // Skip auto-updated timestamp fields
  if (field.isUpdatedAt) {
    return false;
  }

  // Skip auto-generated IDs in Create DTOs but include them in Update DTOs
  if (field.isId && field.hasDefaultValue && !forUpdate) {
    return false;
  }

  // Skip relation objects
  if (field.kind === 'object') {
    return false;
  }

  // Handle read-only fields:
  if (field.isReadOnly) {
    // Special case: if this is a scalar foreign key and the relation field is not read-only,
    // we should still include it
    const isForeignKeyField = model._foreignKeys && model._foreignKeys.has(field.name);
    if (isForeignKeyField) {
      // Check if any of the related relation fields are NOT read-only
      const relationInfo = model._relationFields && model._relationFields.get(field.name);
      if (relationInfo && !relationInfo.isReadOnly) {
        return true; // Include this foreign key even though it's marked as read-only
      }
    }

    // For standard read-only fields in update DTO, include them but mark as readonly
    if (forUpdate) {
      return true; // Will be marked as readonly in the type system
    }

    // Otherwise exclude read-only fields from Create DTOs
    return false;
  }

  // Include all other scalar fields
  return true;
}

/**
 * Helper function to check if a field is an enum type
 */
/**
 * Helper function to check if a field is an enum type
 */
export function isEnumField(field: DMMF.Field, enums: DMMF.DatamodelEnum[]): boolean {
  return enums.some(e => e.name === field.type);
}

/**
 * Get TypeScript type for a field, considering enum types
 */
export function getTypeScriptType(field: DMMF.Field, enums: DMMF.DatamodelEnum[] = []): string {
  // Check if this is a JSON field - use custom DTO
  if (isJsonField(field)) {
    return getJsonFieldDtoName(field.name);
  }

  // Check if this is an enum type
  if (isEnumField(field, enums)) {
    return field.type;
  }

  // Handle array types
  if (field.isList) {
    return `${getBaseTypeScriptType(field)}[]`;
  }

  // Handle optional fields
  if (!field.isRequired) {
    return `${getBaseTypeScriptType(field)} | null`;
  }

  return getBaseTypeScriptType(field);
}

export function getTypeScriptInputType(field: DMMF.Field, enums: DMMF.DatamodelEnum[] = []): string {
  // Check if this is a JSON field - use custom DTO with Prisma.InputJsonValue intersection
  if (isJsonField(field)) {
    const dtoName = getJsonFieldDtoName(field.name);
    return `${dtoName} & Prisma.InputJsonValue`;
  }

  return getTypeScriptType(field, enums).replace(/Prisma\.JsonValue/g, 'Prisma.InputJsonValue')
}

/**
 * Helper to convert Prisma types to TypeScript types
 */


/**
 * Helper to convert Prisma types to TypeScript types
 */
export function getBaseTypeScriptType(field: DMMF.Field): string {
  switch (field.type) {
    case 'String':
      return 'string';
    case 'Int':
    case 'Float':
      return 'number';
    case 'Decimal':
      return 'Prisma.Decimal';
    case 'Boolean':
      return 'boolean';
    case 'DateTime':
      return 'Date';
    case 'Json':
      return 'Prisma.JsonValue';
    default:
      // For relation fields, use the type name
      return field.type;
  }
}

/**
 * Get the appropriate validator decorator for a field based on its type
 */
export function getValidatorForField(field: DMMF.Field): string | null {
  const type = field.type;

  switch (type) {
    case 'String':
      return 'IsString';
    case 'Int':
      return 'IsInt';
    case 'Float':
      return 'IsNumber';
    case 'Decimal':
      return 'IsDecimal';
    case 'Boolean':
      return 'IsBoolean';
    case 'DateTime':
      return 'IsDate';
    default:
      // No specific validator for other types
      return null;
  }
}

/**
 * Get the appropriate operators for a field type
 */
export function getOperatorsForFieldType(fieldType: string): Array<{name: string, description: string}> {
  // For ID fields, should be handled separately with only equals

  switch (fieldType) {
    case 'String':
      // String fields - only equals
      return [
        {name: 'equals', description: 'equals'}
      ];

    case 'Int':
    case 'Float':
    case 'Decimal':
      // Number fields - equals, gte, lte
      return [
        {name: 'equals', description: 'equals'},
        {name: 'gte', description: 'greater than or equal'},
        {name: 'lte', description: 'less than or equal'}
      ];

    case 'DateTime':
      // Date fields - only gte, lte
      return [
        {name: 'gte', description: 'greater than or equal'},
        {name: 'lte', description: 'less than or equal'}
      ];

    case 'Boolean':
      // Boolean fields - only equals
      return [
        {name: 'equals', description: 'equals'}
      ];

    default:
      // Default - only equals for safety
      return [
        {name: 'equals', description: 'equals'}
      ];
  }
}

/**
 * Get TypeScript type for a given field type
 */
export function getTypeScriptTypeForOperator(fieldType: string): string {
  switch (fieldType) {
    case 'String':
      return 'string';
    case 'Int':
      return 'number';
    case 'Float':
    case 'Decimal':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'DateTime':
      return 'Date';
    default:
      return 'string';
  }
}

/**
 * Check if a field is a JSON type
 */
export function isJsonField(field: DMMF.Field): boolean {
  return field.type === 'Json';
}

/**
 * Get the DTO type name for a JSON field
 * Example: security -> SecurityDto
 */
export function getJsonFieldDtoName(fieldName: string): string {
  // Convert to PascalCase and add Dto suffix
  const pascalCase = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  return `${pascalCase}Dto`;
}

/**
 * Get the ApiProperty configuration constant name for a JSON field DTO
 * Example: SecurityDto -> SecurityDtoApiProperty
 */
export function getApiPropertyConfigName(dtoTypeName: string): string {
  return `${dtoTypeName}ApiProperty`;
}

/**
 * Get the decorator function name for a JSON field DTO
 * Example: SecurityDto -> SecurityDtoProperty
 */
export function getJsonFieldDecoratorName(dtoTypeName: string): string {
  return `${dtoTypeName}Property`;
}

/**
 * Convert a field name to kebab-case for file naming
 * Example: security -> security, apiConfig -> api-config
 */
export function fieldNameToKebabCase(fieldName: string): string {
  return fieldName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

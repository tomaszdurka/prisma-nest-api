/**
 * Utility functions for string formatting in the generator
 */

/**
 * Converts a string from PascalCase or camelCase to kebab-case
 * Examples:
 * - EndpointComponent -> endpoint-component
 * - endpointComponent -> endpoint-component
 * - Endpoint -> endpoint
 */
export function toKebabCase(str: string): string {
  // Replace all capital letters with a hyphen followed by the lowercase version
  // Except for the first letter, which just gets lowercase without a hyphen
  return str
    .replace(/^([A-Z])/, (_, p1) => p1.toLowerCase())
    .replace(/([A-Z])/g, (_, p1) => `-${p1.toLowerCase()}`);
}

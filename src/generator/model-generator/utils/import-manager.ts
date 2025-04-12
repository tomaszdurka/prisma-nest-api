
/**
 * Utility class to manage imports
 */
export class ImportManager {
  private imports: Map<string, Set<string>> = new Map();

  /**
   * Add an import from a specific module
   */
  addImport(from: string, what: string | string[]): void {
    const items = Array.isArray(what) ? what : [what];

    if (!this.imports.has(from)) {
      this.imports.set(from, new Set());
    }

    const moduleImports = this.imports.get(from)!;
    items.forEach(item => moduleImports.add(item));
  }

  /**
   * Check if an import exists
   */
  has(from: string, what: string): boolean {
    if (!this.imports.has(from)) return false;
    return this.imports.get(from)!.has(what);
  }

  /**
   * Generate the import statements as a string
   */
  generateImports(): string {
    const lines: string[] = [];

    // Sort modules for consistent order
    const modules = Array.from(this.imports.keys()).sort();

    for (const module of modules) {
      const items = Array.from(this.imports.get(module)!).sort();
      if (items.length === 0) continue;

      lines.push(`import { ${items.join(', ')} } from '${module}';`);
    }

    return lines.join('\n') + (lines.length > 0 ? '\n\n' : '');
  }
}

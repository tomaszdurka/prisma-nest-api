import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Copy utility files from library to the generated output directory
 * This ensures that the generated code doesn't have runtime dependencies on the library
 */
export async function copyUtilities(outputDir: string): Promise<void> {
  try {
    // Define source and destination directories
    // Use assets directory for source files to ensure TypeScript source files are copied (not compiled JS)
    const sourceLibDir = path.join(__dirname, '..', '..', 'assets', 'lib');
    const targetLibDir = path.join(outputDir, 'lib');
    
    // Use fs.cp to recursively copy the entire directory
    await fs.cp(sourceLibDir, targetLibDir, { recursive: true });
    
  } catch (error) {
    console.error('Error copying utility files:', error);
  }
}
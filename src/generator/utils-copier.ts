import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Copy utility files from library to the generated output directory
 * This ensures that the generated code doesn't have runtime dependencies on the library
 */
export async function copyUtilities(outputDir: string): Promise<void> {
  try {
    console.log('Copying utility files to generated output directory...');
    
    // Define source and destination directories
    const sourceLibDir = path.join(__dirname, '..', 'lib');
    const targetLibDir = path.join(outputDir, 'lib');
    
    // Use fs.cp to recursively copy the entire directory
    await fs.cp(sourceLibDir, targetLibDir, { recursive: true });
    
    console.log(' Utility files copied successfully!');
  } catch (error) {
    console.error('Error copying utility files:', error);
  }
}
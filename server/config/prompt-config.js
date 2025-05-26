// Prompt configuration
export const promptConfig = {
  // Choose which system prompt to use: 'v1' or 'v2'
  systemPromptVersion: 'v2',
  
  // Enable/disable autonomous file operations
  enableAutonomousOperations: true,
  
  // Maximum number of file operations per response
  maxFileOperationsPerResponse: 5,
  
  // File size limits
  maxFileSize: 50000, // characters
  
  // Allowed file extensions
  allowedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md'],
  
  // Restricted paths (files AI cannot modify)
  restrictedPaths: [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    '.env',
    '.gitignore'
  ]
}
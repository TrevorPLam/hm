import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(REPO_ROOT, 'repository.md');

const EXCLUDE_DIRS = [
  'node_modules',
  'dist',
  '.git',
  '.expo',
  '.expo-shared',
  '.cache',
  '.local',
  'build',
  'out',
  'tmp',
  'coverage',
  '.replit-artifact',
];

const EXCLUDE_FILES = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  '.DS_Store',
  'Thumbs.db',
  '*.tsbuildinfo',
];

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

function shouldExclude(filePath: string): boolean {
  const basename = path.basename(filePath);
  
  for (const exclude of EXCLUDE_FILES) {
    if (basename === exclude || basename.endsWith('.tsbuildinfo')) {
      return true;
    }
  }
  
  return false;
}

function isTextFile(filePath: string): boolean {
  const textExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.json', '.yaml', '.yml', '.toml',
    '.md', '.txt', '.sql',
    '.sh', '.bash', '.zsh',
    '.dockerfile',
    '.env.example', '.env',
    '.gitignore', '.dockerignore',
    '.eslintrc', '.prettierrc',
  ];
  
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();
  
  if (textExtensions.includes(ext)) return true;
  if (basename.startsWith('.') && !basename.includes('.')) return true;
  if (basename === 'dockerfile') return true;
  
  return false;
}

function getFileHeader(filePath: string, relativePath: string): string {
  const stats = fs.statSync(filePath);
  const size = stats.size;
  const sizeKB = (size / 1024).toFixed(2);
  
  return `\n\n${'='.repeat(80)}\nFILE: ${relativePath}\nSIZE: ${sizeKB} KB\n${'='.repeat(80)}\n\n`;
}

function consolidateDirectory(dir: string, output: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(REPO_ROOT, fullPath);
    
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) {
        continue;
      }
      consolidateDirectory(fullPath, output);
    } else if (entry.isFile()) {
      if (shouldExclude(fullPath)) {
        continue;
      }
      
      const stats = fs.statSync(fullPath);
      if (stats.size > MAX_FILE_SIZE) {
        output.push(getFileHeader(fullPath, relativePath));
        output.push(`[FILE TOO LARGE - ${stats.size} bytes - SKIPPED]\n`);
        continue;
      }
      
      if (!isTextFile(fullPath)) {
        output.push(getFileHeader(fullPath, relativePath));
        output.push(`[BINARY FILE - SKIPPED]\n`);
        continue;
      }
      
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        output.push(getFileHeader(fullPath, relativePath));
        output.push(content);
      } catch (error) {
        output.push(getFileHeader(fullPath, relativePath));
        output.push(`[ERROR READING FILE: ${error}]\n`);
      }
    }
  }
}

function main(): void {
  console.log('Consolidating repository files...');
  console.log(`Repository root: ${REPO_ROOT}`);
  console.log(`Output file: ${OUTPUT_FILE}`);
  
  const output: string[] = [];
  
  output.push('# Repository Consolidation\n');
  output.push(`Generated: ${new Date().toISOString()}\n`);
  output.push(`Repository: ${REPO_ROOT}\n`);
  output.push('\n');
  output.push('This document contains all native source files from the repository.\n');
  output.push('Binary files and files larger than 1MB are excluded.\n');
  output.push('\n');
  
  consolidateDirectory(REPO_ROOT, output);
  
  fs.writeFileSync(OUTPUT_FILE, output.join(''), 'utf-8');
  
  const totalSize = Buffer.byteLength(output.join(''), 'utf-8');
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  console.log(`Consolidation complete.`);
  console.log(`Total output size: ${sizeMB} MB`);
  console.log(`Output written to: ${OUTPUT_FILE}`);
}

main();

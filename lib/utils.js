const path = require('path');
const fs = require('fs-extra');

/**
 * Checks if an import path is an external package (not relative or absolute local path)
 */
function isExternalPackage(importPath) {
  return !importPath.startsWith('.') && !importPath.startsWith('/') && !path.isAbsolute(importPath);
}

/**
 * Extracts the base package name from an import path.
 * Handles scoped packages (@scope/name) and deep imports (pkg/dist/file).
 */
function getPackageName(importPath) {
  const parts = importPath.split('/');
  if (importPath.startsWith('@')) {
    return parts.slice(0, 2).join('/');
  }
  return parts[0];
}

/**
 * Recursively gets all source files in a directory matching extensions.
 */
async function getSourceFiles(dir, extensions = ['.js', '.mjs', '.cjs', '.ts'], exclude = ['node_modules', '.git', 'dist', 'build']) {
  let results = [];
  const list = await fs.readdir(dir);

  for (const file of list) {
    if (exclude.includes(file)) continue;
    
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);

    if (stat && stat.isDirectory()) {
      const res = await getSourceFiles(filePath, extensions, exclude);
      results = results.concat(res);
    } else {
      if (extensions.includes(path.extname(file))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

/**
 * Formats bytes to human readable string.
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = {
  isExternalPackage,
  getPackageName,
  getSourceFiles,
  formatBytes
};

const fs = require('fs-extra');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { isExternalPackage, getPackageName } = require('./utils');

/**
 * Scans a file for external package imports and requires.
 */
async function scanFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const packages = new Set();

  try {
    const ast = parser.parse(content, {
      sourceType: 'unambiguous',
      plugins: [
        'typescript',
        'jsx',
        'dynamicImport',
        'classProperties',
        'objectRestSpread'
      ]
    });

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (isExternalPackage(source)) {
          packages.add(getPackageName(source));
        }
      },
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (
          callee.type === 'Identifier' && 
          callee.name === 'require' && 
          args.length > 0 && 
          args[0].type === 'StringLiteral'
        ) {
          const source = args[0].value;
          if (isExternalPackage(source)) {
            packages.add(getPackageName(source));
          }
        }
      },
      // Handle export ... from 'package'
      ExportNamedDeclaration(path) {
        if (path.node.source && isExternalPackage(path.node.source.value)) {
          packages.add(getPackageName(path.node.source.value));
        }
      },
      ExportAllDeclaration(path) {
        if (path.node.source && isExternalPackage(path.node.source.value)) {
          packages.add(getPackageName(path.node.source.value));
        }
      }
    });
  } catch (error) {
    console.warn(`[Scanner] Warning: Could not parse ${filePath}. Error: ${error.message}`);
  }

  return packages;
}

/**
 * Scans multiple files and returns a map of file path to its external packages.
 */
async function scanFiles(filePaths) {
  const fileToPackages = new Map();
  for (const filePath of filePaths) {
    const packages = await scanFile(filePath);
    if (packages.size > 0) {
      fileToPackages.set(filePath, packages);
    }
  }
  return fileToPackages;
}

module.exports = {
  scanFile,
  scanFiles
};

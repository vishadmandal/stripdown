const fs = require('fs-extra');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { isExternalPackage, getPackageName } = require('./utils');

/**
 * Analyzes file usage to determine which specific exports are used from which packages.
 */
async function analyzeFile(filePath, usageMap = new Map()) {
  const content = await fs.readFile(filePath, 'utf-8');

  try {
    const ast = parser.parse(content, {
      sourceType: 'unambiguous',
      plugins: ['typescript', 'jsx', 'dynamicImport', 'classProperties', 'objectRestSpread']
    });

    traverse(ast, {
      // Handle: import { map, filter } from 'lodash'
      // Handle: import _, { map } from 'lodash'
      // Handle: import * as _ from 'lodash'
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (!isExternalPackage(source)) return;

        const pkgName = getPackageName(source);
        if (!usageMap.has(pkgName)) usageMap.set(pkgName, new Set());
        const used = usageMap.get(pkgName);

        // If it's a deep import like 'lodash/map', consider the whole thing used or 'map' used
        if (source.includes('/') && !source.startsWith('@')) {
            // e.g. import map from 'lodash/map'
            used.add('*'); // For now, deep imports keep the whole sub-module
            return;
        }

        path.node.specifiers.forEach(spec => {
          if (spec.type === 'ImportSpecifier') {
            // Named import: { map }
            used.add(spec.imported.name);
          } else if (spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportNamespaceSpecifier') {
            // Default or Namespace import: _ or * as _
            // We need to track property access on this identifier
            trackPropertyAccess(path.scope, spec.local.name, used);
          }
        });
      },

      // Handle: const { map } = require('lodash')
      // Handle: const _ = require('lodash')
      VariableDeclarator(path) {
        const init = path.node.init;
        if (!init || init.type !== 'CallExpression' || init.callee.name !== 'require') return;
        
        const source = init.arguments[0]?.value;
        if (!source || !isExternalPackage(source)) return;

        const pkgName = getPackageName(source);
        if (!usageMap.has(pkgName)) usageMap.set(pkgName, new Set());
        const used = usageMap.get(pkgName);

        if (source.includes('/') && !source.startsWith('@')) {
            used.add('*');
            return;
        }

        const id = path.node.id;
        if (id.type === 'ObjectPattern') {
          // Destructured: const { map } = require('lodash')
          id.properties.forEach(prop => {
            if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
              used.add(prop.key.name);
            }
          });
        } else if (id.type === 'Identifier') {
          // Assignment: const _ = require('lodash')
          trackPropertyAccess(path.scope, id.name, used);
        }
      },

      // Handle: require('dotenv').config()
      CallExpression(path) {
          const callee = path.node.callee;
          if (callee.type === 'MemberExpression' && callee.object.type === 'CallExpression') {
              const innerCall = callee.object;
              if (innerCall.callee.name === 'require') {
                  const source = innerCall.arguments[0]?.value;
                  if (source && isExternalPackage(source)) {
                      const pkgName = getPackageName(source);
                      if (!usageMap.has(pkgName)) usageMap.set(pkgName, new Set());
                      usageMap.get(pkgName).add(callee.property.name);
                  }
              }
          }
      }
    });
  } catch (error) {
    console.warn(`[Analyzer] Warning: Could not parse ${filePath}. Error: ${error.message}`);
  }

  return usageMap;
}

/**
 * Tracks property access on a given identifier within its scope.
 * e.g., for `const _ = require('lodash')`, find all `_.map`, `_.filter` etc.
 */
function trackPropertyAccess(scope, identifierName, usedSet) {
  const binding = scope.getBinding(identifierName);
  if (!binding) return;

  binding.referencePaths.forEach(refPath => {
    const parent = refPath.parent;
    if (parent.type === 'MemberExpression' && parent.object === refPath.node) {
      if (parent.property.type === 'Identifier') {
        usedSet.add(parent.property.name);
      }
    } else {
        // If used as a non-member expression (e.g. passed to a function), 
        // we can't safely know what's used, so we mark as '*'
        usedSet.add('*');
    }
  });
}

/**
 * Analyzes multiple files.
 */
async function analyzeFiles(filePaths) {
  const usageMap = new Map();
  for (const filePath of filePaths) {
    await analyzeFile(filePath, usageMap);
  }
  return usageMap;
}

module.exports = {
  analyzeFile,
  analyzeFiles
};

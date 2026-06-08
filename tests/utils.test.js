const assert = require('assert');
const { isExternalPackage, getPackageName } = require('../lib/utils');

console.log('Running utils tests...');

// isExternalPackage
assert.strictEqual(isExternalPackage('lodash'), true);
assert.strictEqual(isExternalPackage('@babel/core'), true);
assert.strictEqual(isExternalPackage('./local'), false);
assert.strictEqual(isExternalPackage('../parent'), false);
assert.strictEqual(isExternalPackage('/absolute'), false);

// getPackageName
assert.strictEqual(getPackageName('lodash'), 'lodash');
assert.strictEqual(getPackageName('lodash/map'), 'lodash');
assert.strictEqual(getPackageName('@babel/core'), '@babel/core');
assert.strictEqual(getPackageName('@babel/core/lib/parse'), '@babel/core');

console.log('✅ Utils tests passed!');

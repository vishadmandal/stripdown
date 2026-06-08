const _ = require('lodash');

function processItems(items) {
    return _.reduce(items, (sum, n) => sum + n, 0);
}

module.exports = { processItems };

var fs = require('fs'),
    writeFileAtomic = require('write-file-atomic');

// XXX replace this shit with something way better
var config = require('../config');

try {
    var authorizedKeys = require(config.keysFile);
} catch (e) {
    if (e.code == 'MODULE_NOT_FOUND') {
	fs.writeFileSync(config.keysFile, '[]');
	var authorizedKeys = [];
    } else {
	throw e;
    }
}

module.exports.add = function(key, cb) {
    if (!authorizedKeys.includes(key)) {
	authorizedKeys.push(key);
	writeFileAtomic(config.keysFile, JSON.stringify(authorizedKeys), cb);
    } else {
	process.nextTick(cb);
    }
}

module.exports.list = authorizedKeys;

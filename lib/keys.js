/*

Copyright 2019 AJ Jordan <alex@strugee.net>.

This file is part of minecraft-switcher.

minecraft-switcher is free software: you can redistribute it and/or
modify it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

minecraft-switcher is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public
License along with minecraft-switcher. If not, see
<https://www.gnu.org/licenses/>.

*/

'use strict';

var fs = require('fs'),
    assert = require('assert'),
    writeFileAtomic = require('write-file-atomic'),
    config = require('./config');

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
    assert(key);
    assert(key.credID);
    // XXX try to dedupe keys somehow
    authorizedKeys.push(key);
    writeFileAtomic(config.keysFile, JSON.stringify(authorizedKeys), cb);
}

module.exports.list = authorizedKeys;

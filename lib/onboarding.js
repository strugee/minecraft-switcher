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

var uuid = require('uuid'),
    generateWords = require('adjective-adjective-animal');

var untrustedTokens = new Map();
var tokens = new Map();

async function create() {
    var token = uuid();
    var words = await generateWords("lower");

    untrustedTokens.set(token, words);

    setTimeout(function() {
	untrustedTokens.delete(token);
	tokens.delete(token);
    }, 1000 * 60 * 5); // 5 minutes

    return {
	token,
	words
    };
}

function approve(id) {
    // Check if the token expired while the user was setting it
    if (untrustedTokens.has(id)) tokens.set(id, untrustedTokens.get(id));
    return untrustedTokens.delete(id);
}

module.exports.untrustedTokens = untrustedTokens;
module.exports.tokens = tokens;
module.exports.create = create;
module.exports.approve = approve;

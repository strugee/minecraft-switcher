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

var assert = require('assert');

// XXX replace this shit with something way better
try {
    var config = require('../config');
} catch (e) {
    config = require('/etc/minecraft-switcher.json');
}

assert.notEqual(config.secret, 'change me', 'The application secret has not been changed in the config');
config.port = config.port || 1337;

module.exports = config;

/*

  Copyright 2020 AJ Jordan <alex@strugee.net>.

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

var propDb = require('minecraft-server.properties-prop-db'),
    serverProperties = require('minecraft-server-properties'),
    _ = require('lodash');

function mergeServerProperties(master, world) {
	master = serverProperties.parse(master);
	world = serverProperties.parse(world);
	return serverProperties.stringify(Object.assign({}, master, world));
}

function splitCriteria(value, key) {
	// This is the criteria for the master properties
	var affects = propDb[key].affects;
	return affects !== 'world' && affects !== 'gameplay';
}

function splitServerProperties(props) {
	var master = {},
	    world = {};

	props = serverProperties.parse(props);

	// This is inefficient to do twice, but who cares
	master = _.pickBy(props, splitCriteria);
	world = _.pickBy(props, (a, b) => !splitCriteria(a, b));

	master = serverProperties.stringify(master);
	world = serverProperties.stringify(world);

	return [master, world];
}

module.exports.merge = mergeServerProperties;
module.exports.split = splitServerProperties;

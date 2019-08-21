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
    spawn = require('smart-spawn'),
    EventEmitter = require('events'),
    assert = require('assert'),
    path = require('path'),
    bach = require('bach');

// XXX replace this shit with something way better
var config = require('../config');

var serverPath = '/opt/spigot';

var emitter = new EventEmitter(),
    switchInProgress = false,
    error;

emitter.on('error', function(err) {
    error = err;
});

var worlds = fs.readdirSync(path.join(serverPath, 'world_repository'));
if (worlds.length === 0) {
    throw new Error('fatal: no worlds in world_repository; have you moved your original into place?');
}

function handleWorldLevel(newWorld, levelName) {
    var activePath = path.join(serverPath, 'world' + levelName);
    return bach.series(
	fs.unlink.bind(null, activePath),
	fs.symlink.bind(null, path.join(serverPath, 'world_repository', newWorld, 'world' + levelName), activePath),
	function(cb) {
	    emitter.emit('level-switched', levelName[0] === '_' ? levelName.slice(1) : levelName);
	    cb();
	}
    );
}

function switchWorld(worldName) {
    if (switchInProgress) return null;
    switchInProgress = true;

    spawn('systemctl', ['stop', 'spigot.service'], serverPath, function(err, stdout) {
	if (err) return emitter.emit('error', err);

	assert(stdout === '');

	emitter.emit('server-stopped');

	var activateNewWorld = bach.parallel(
	    handleWorldLevel(worldName, ''),
	    handleWorldLevel(worldName, '_nether'),
	    handleWorldLevel(worldName, '_the_end')
	);

	activateNewWorld(function(err) {
	    if (err) return emitter.emit('error', err);

	    emitter.emit('world-switched');
	    spawn('systemctl', ['start', 'spigot.service'], serverPath, function(err, stdout) {
		if (err) return emitter.emit('error', err);

		assert(stdout === '');

		emitter.emit('server-started');

		spawn('sh', ['-c', 'journalctl -u minecraft-server -n 1 -f | grep -m 1 "Done.*For help, type \\"help\\""'], serverPath, function(err, stdout) {
		    if (err) return emitter.emit('error', err);

		    emitter.emit('server-ready');
		    switchInProgress = false;
		});
	    });
	});
    });

    return emitter;
}

module.exports.worlds = worlds;
module.exports.emitter = emitter;
module.exports.error = error;
module.exports.switchWorld = switchWorld;

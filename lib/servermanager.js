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

var worlds = fs.readdirSync(path.join(serverPath, 'world_repository'));
if (worlds.length === 0) {
    throw new Error('fatal: no worlds in world_repository; have you moved your original into place?');
}

function handleWorldLevel(newWorld, levelName) {
    var activePath = path.join(serverPath, 'world' + levelName);
    return bach.series(
	fs.unlink.bind(null, activePath),
	fs.symlink.bind(null, path.join(serverPath, 'world_repository', newWorld, 'world' + levelName), activePath)
    );
}

function switch(worldName) {
    var emitter = new EventEmitter();
    spawn('systemctl' ['stop', 'spigot.service'], serverPath, function(err, stdout) {
	if (err) return emitter.emit('error', err);

	assert(stdout === '');

	emitter.emit('server-stopped');

	// XXX do the world move etc. here

	spawn('systemctl', ['start', 'spigot.service'], serverPath, function(err, stdout) {
	    if (err) return emitter.emit('error', err);

	    assert(stdout === '');

	    emitter.emit('server-started');

	    spawn('sh', ['-c', 'journalctl', '-u', 'minecraft-server', '-n', '1', '-f', '|', 'grep', '-m', '1', 'Done.*For help, type "help"'], serverPath, function(err, stdout) {
		if (err) return emitter.emit('error', err);

		emitter.emit('server-ready');
	    }
	}
}

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
    bach = require('bach'),
    propFileUtil = require('./serverproperties');

var config = require('./config');

var serverPath = '/opt/spigot';

var emitter = new EventEmitter(),
    switchInProgress = false;

// Read worlds and refuse to start if there are none yet
var worlds = fs.readdirSync(path.join(serverPath, 'world_repository'));
if (worlds.length === 0) {
    throw new Error('fatal: no worlds in world_repository; have you moved your original into place?');
}

// Split up server.properties if necessary
if (!fs.existsSync(path.join(serverPath, 'server.properties.frag'))) {
        assert.strictEqual(worlds.length, 1, 'fatal: server.properties has not been split, but more than one world exists in world_repository')
        var fragments = propFileUtil.split(fs.readFileSync(path.join(serverPath, 'server.properties'), 'utf8'));
        fs.writeFileSync(path.join(serverPath, 'server.properties.frag'), fragments[0]);
        fs.writeFileSync(path.join(serverPath, 'world_repository', worlds[0], 'server.properties.worldfrag'), fragments[1]);
}

function handleWorldLevel(newWorld, levelName) {
    var activePath = path.join(serverPath, levelName);
    return bach.series(
        fs.unlink.bind(null, activePath),
        fs.symlink.bind(null, path.join(serverPath, 'world_repository', newWorld, 'world' + levelName), activePath),
        function(cb) {
            if (levelName === 'server.properties') {
                emitter.emit('properties-file-switched');
            } else {
                emitter.emit('level-switched', levelName[5] === '_' ? levelName.slice(1) : levelName);
            }
            cb();
        }
    );
}

function switchWorld(worldName) {
    if (switchInProgress) return null;
    switchInProgress = true;

    var run = bach.series(
        // Stage 1: read fragments, shutdown server
        bach.parallel(
            fs.readFile.bind(null, path.join(serverPath, 'server.properties.frag')),
            fs.readFile.bind(null, path.join(serverPath, 'world_repository', worlds[0], 'server.properties.worldfrag')),
            function(done) {
                spawn('systemctl', ['stop', 'spigot.service'], serverPath, function(err, stdout) {
                    if (err) throw err;

                    assert(stdout === '');

                    emitter.emit('server-stopped');

                    done();
                });
            }
        ),
        // Stage 2: write server.properties, activate world
        bach.parallel(
            bach.series(
                bach.parallel(
                    handleWorldLevel(worldName, 'world'),
                    handleWorldLevel(worldName, 'world_nether'),
                    handleWorldLevel(worldName, 'world_the_end'),
                    handleWorldLevel(worldName, 'server.properties')
                ),
                function(done) {
                    emitter.emit('world-switched');

                    done();
                }
            ),
            bach.series(
                function(done, results) {
                    debugger;

                    // TODO write server.properties
                    var world = 'a=b', master = 'c=d';
                    fs.writeFile(path.join(serverPath, 'server.properties'), propFileUtil.merge(master, world), done);
                },
                function(done) {
                    emitter.emit('server-properties-written');

                    done();
                }
            )
        ),
        // Stage 3: start server
        bach.series(
            function(done) {
                spawn('systemctl', ['start', 'spigot.service'], serverPath, function(err, stdout) {
                    if (err) throw err;

                    assert(stdout === '');

                    emitter.emit('server-started');

                    done();
                });
            },
            function(done) {
                spawn('sh', ['-c', 'journalctl -u minecraft-server -n 1 -f | grep -m 1 "Done.*For help, type \\"help\\""'], serverPath, function(err, stdout, cb) {
                    if (err) throw err;

                    emitter.emit('server-ready');
                    switchInProgress = false;

                    cb();
                });
            }
        )
    );

    run(function(err) {
        if (err) emitter.emit('error', err);
    });

    return emitter;
}

module.exports.worlds = worlds;
module.exports.emitter = emitter;
module.exports.switchWorld = switchWorld;

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

var http = require('http'),
    express = require('express'),
    compression = require('compression'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    WebAuthn = require('webauthn');

// XXX replace this shit with something way better
var config = require('./config');

var app = express();
var webauthn = new WebAuthn({
    origin: config.origin,
    rpName: 'Minecraft admin UI'
});

app.set('view engine', 'pug');

app.use(compression());

// TODO actually tune the options here
app.use(session({
    secret: config.secret
}));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json())

app.use('/static', express.static('./static'));
app.use('/webauthn', webauthn.initialize());

app.get('/', webauthn.authenticate({noResponse: true}), function(req, res, next) {
    if (!req.user) {
	// XXX require auth here
	res.render('authenticate');
    } else {
	// XXX serve the authorized page here
	res.render('admin');
    }
});

http.createServer(app).listen(1337, function() {
    console.log('listening');
});

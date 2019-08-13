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
    webauthn = require('@webauthn/server'),
    keys = require('./lib/keys');

// XXX replace this shit with something way better
var config = require('./config');

var app = express();

app.set('view engine', 'pug');

app.use(compression());

// TODO actually tune the options here
app.use(session({
    secret: config.secret
}));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json())

app.use('/static', express.static('./static'));

app.post('/webauthn/register/challenge', function(req, res, next) {
    var id = req.body.id;
    var name = req.body.name;
    var challengeResponse = webauthn.generateRegistrationChallenge({
	relyingParty: {
	    name: 'Minecraft admin UI'
	},
	user: {
	    id,
	    name
	}
    });

    Object.assign(req.session, {
	authid: id,
	challenge: challengeResponse.challenge
    });

    res.send(challengeResponse);
});

app.post('/webauthn/register', function(req, res, next) {
    var regReq = webauthn.parseRegisterRequest(req.body);
    keys.add(regReq.key, function(err) {
	if (err) return next(err);
	req.session.authorized = true;
	res.end();
    });
});

app.post('/webauthn/login/challenge', function(req, res, next) {
    // TODO `key` isn't included by the client
    var assertionChallenge = webauthn.generateLoginChallenge(keys.list);

    req.session.challenge = assertionChallenge.challenge;
    res.send(assertionChallenge);
});

app.post('/webauthn/login', function(req, res, next) {
    var loginReq = webauthn.parseLoginRequest(req.body);
    if (!loginReq.challenge) return res.status(400).send('No challenge response sent');;

    var authorizedKey = null;
    for (var i of keys.list) {
	// O(n) but it's a very small n so who cares
	debugger;
	if (loginReq.keyId == i.credID) {
	    authorizedKey = i;
	    break;
	}
    }

    if (!authorizedKey) {
	return res.status(400).send('Not an authorized key');
    }

    var authorized = webauthn.verifyAuthenticatorAssertion(req.body, authorizedKey);
    req.session.authorized = authorized;

    if (authorized) {
	res.end();
    } else {
	res.sendStatus(400); // XXX is 400 right?
    }
});

app.get('/', function(req, res, next) {
    if (!req.session.authorized) {
	res.render('authenticate', {needInitialRegister: keys.list.length === 0});
    } else {
	res.render('admin');
    }
});

http.createServer(app).listen(1337, function() {
    console.log('listening');
});

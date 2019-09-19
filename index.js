#!/usr/bin/env node

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

require('make-promises-safe');

var http = require('http'),
    assert = require('assert'),
    path = require('path'),
    express = require('express'),
    compression = require('compression'),
    session = require('cookie-session'),
    bodyParser = require('body-parser'),
    webauthn = require('@webauthn/server'),
    bunyan = require('bunyan'),
    bunyanMiddleware = require('bunyan-middleware'),
    Sentry = require('@sentry/node'),
    keys = require('./lib/keys'),
    onboarding = require('./lib/onboarding'),
    servermanager = require('./lib/servermanager'),
    config = require('./lib/config');

var log = bunyan.createLogger({
    name: 'minecraft-switcher',
    serializers: {
        req: bunyan.stdSerializers.req,
        res: bunyan.stdSerializers.res,
        err: bunyan.stdSerializers.err
    }
});

var app = express();

Sentry.init({dsn: config.sentryDsn });
app.use(Sentry.Handlers.requestHandler());

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.set('env', config.dev ? 'development' : 'production');

app.use(compression());

app.use(session({
    secret: config.secret,
    httpOnly: true,
    secure: !config.dev,
    sameSite: 'lax'
}));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json())

app.use('/static', express.static(path.join(__dirname, 'static')));

app.use(bunyanMiddleware({
    logger: log
}));

function requireAuth(req, res, next) {
    if (!req.session.authorized) return res.status(401).end();
    next();
}

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
    if (keys.list.length === 0
	|| req.session.authorized
	|| onboarding.tokens.has(req.session.token.token)) {
	var regReq = webauthn.parseRegisterRequest(req.body);
	keys.add(regReq.key, function(err) {
	    if (err) return next(err);
	    req.session.authorized = true;
	    res.end();
	});
    } else {
	res.status(401).end();
    }
});

app.post('/webauthn/login/challenge', function(req, res, next) {
    // TODO the client doesn't indicate which key
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
	if (loginReq.keyId === i.credID) {
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

app.post('/webauthn/logout', function(req, res, next) {
    req.session.authorized = false;
    res.end();
});

app.get('/', function(req, res, next) {
    if (!req.session.authorized) {
	res.render('authenticate', {needInitialRegister: keys.list.length === 0});
    } else {
	res.render('admin', {
	    worlds: servermanager.worlds
	});
    }
});

app.get('/onboarding', async function(req, res, next) {
    if (req.session.authorized) {
	res.render('onboard', {
	    untrustedTokens: onboarding.untrustedTokens,
	    tokens: onboarding.tokens
	});
    } else {
	// Check if the token in the session is stale
	if (req.session.token
	    && !(onboarding.untrustedTokens.has(req.session.token.token)
		|| onboarding.tokens.has(req.session.token.token))) {
	    delete req.session.token;
	}

	// XXX try removing this `try`
	try {
	    if (!req.session.token) {
		var token = await onboarding.create();
		req.session.token = token;
	    } else {
		var token = req.session.token;
	    }

	    res.render('onboard-wait', {
		approved: onboarding.tokens.has(req.session.token.token),
		token
	    });
	} catch (e) {
	    next(e);
	}
    }
});

app.get('/onboarding/approve/:tokenId', requireAuth, function(req, res, next) {
    onboarding.approve(req.params.tokenId);
    res.redirect('/onboarding');
});

app.post('/control/switch', requireAuth, function(req, res, next) {
    if (!req.body.target) return res.status(400).send('Request did not include target world');

    var switchJob = servermanager.switchWorld(req.body.target);

    if (!switchJob) return res.status(409).send('World switch already in progress; please wait');

    res.status(202).end();
});

app.use(Sentry.Handlers.errorHandler());

http.createServer(app).listen(config.port, function() {
    log.info('Server listening');
});

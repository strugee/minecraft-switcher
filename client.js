//var webauthn = require('@webauthn/client');
import { solveRegistrationChallenge, solveLoginChallenge } from '@webauthn/client';
var webauthn = {
    solveRegistrationChallenge,
    solveLoginChallenge
};

// XXX bare './config' didn't work, seems like a Browserify bug
var config = require('./config.json');

async function register() {
    var challenge = await fetch('/webauthn/register/challenge', {
	method: 'POST',
	headers: {
	    'Content-Type': 'application/json'
	},
	body: JSON.stringify({ id: 'generic', name: 'generic' })
    }).then(res => res.json());

    var creds = await webauthn.solveRegistrationChallenge(challenge);

    await fetch('/webauthn/register', {
	method: 'POST',
	headers: {
	    'Content-Type': 'application/json'
	},
	body: JSON.stringify(creds)
    });

    // TODO error handling

    location.reload();
}

async function login() {
    var challenge = await fetch('/webauthn/login/challenge', {
	method: 'POST',
	headers: {
	    'Content-Type': 'application/json'
	},
	body: JSON.stringify({ name: 'generic' })
    }).then(res => res.json());

    var creds = await webauthn.solveLoginChallenge(challenge);

    await fetch('/webauthn/login', {
	method: 'POST',
	headers: {
	    'Content-Type': 'application/json'
	},
	body: JSON.stringify(creds)
    });

    // TODO error handling

    location.reload();
}

document.addEventListener('DOMContentLoaded', function() {
    var initialRegister = document.getElementById('initialRegister');
    if (initialRegister) initialRegister.addEventListener('click', register);

    var loginButton = document.getElementById('login');
    if (loginButton) loginButton.addEventListener('click', login);
}, false);

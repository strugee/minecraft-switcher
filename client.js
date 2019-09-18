//var webauthn = require('@webauthn/client');
import { solveRegistrationChallenge, solveLoginChallenge } from '@webauthn/client';
var webauthn = {
    solveRegistrationChallenge,
    solveLoginChallenge
};

async function register(finalTarget) {
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

    if (!finalTarget) {
	location.reload();
    } else {
	location.replace(finalTarget);
    }
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

async function logout() {
    await fetch('/webauthn/logout', {
	method: 'POST'
    });

    location.reload();
}


function maybeAddListener(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
}

document.addEventListener('DOMContentLoaded', function() {
    maybeAddListener('initialRegister', register.bind(null, null));
    maybeAddListener('login', login);
    maybeAddListener('newKey', register.bind(null, null));
    maybeAddListener('newKeyRemote', register.bind(null, '/'));
    maybeAddListener('logout', logout);
}, false);

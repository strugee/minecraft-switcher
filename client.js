//var webauthn = require('@webauthn/client');
import { solveRegistrationChallenge, solveLoginChallenge } from '@webauthn/client';
var webauthn = {
    solveRegistrationChallenge,
    solveLoginChallenge
};

function wrapPromiseFn(fn) {
    return function wrappedPromiseFunction() {
        var p = fn.apply(null, arguments);
        p.catch(function(err) {
            alert('Encountered an error: ' + err.message + '\nPlease refresh. If the error persists, contact the system administrator.');
        });
    };
}

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
    maybeAddListener('initialRegister', wrapPromiseFn(register).bind(null, null));
    maybeAddListener('login', wrapPromiseFn(login));
    maybeAddListener('newKey', wrapPromiseFn(register).bind(null, null));
    maybeAddListener('newKeyRemote', wrapPromiseFn(register).bind(null, '/'));
    maybeAddListener('logout', wrapPromiseFn(logout));
}, false);

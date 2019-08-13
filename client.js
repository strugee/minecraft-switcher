var Client = require('webauthn/client').default;

// XXX bare './config' didn't work, seems like a Browserify bug
var config = require('./config.json');

var client = new Client();

client.register({attestation: 'none', name: 'generic', username: 'generic'}).then(function() {
    client.login({name: 'generic'}).then(function() {
	navigator.reload();
    });
});

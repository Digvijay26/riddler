'use strict';

module.change_code = 1;

const Alexa = require('alexa-app');

const app = new Alexa.app('riddler');

// ------------------------------------------
// Amazon Skills Kit Intents

// Launch Intent
app.launch(function(req, res) {
  var prompt = 'Hello. Welcome to Riddler. This skill is in progress. Please be patient.';
  res.say(prompt).shouldEndSession(false);
});

module.exports = app;

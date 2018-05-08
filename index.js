'use strict';
module.change_code = 1;
const Alexa = require('alexa-app');
const app = new Alexa.app('riddler');
const RiddleModule = require('./lib/RiddleModule');
const QuestionModule = require('./lib/QuestionModule');
const StoryModule = require('./lib/StoryModule');
const DatabaseHelper = require('./database_helper');
const RandomModule = require('./lib/RandomInsertsModule');
const databaseHelper = new DatabaseHelper();

// ------------------------------------------
// Amazon Skills Kit Intents

// ------------------------------------------
// Intents Shared across modules
//
//

const getRiddleModuleByIntent = (intentName) => {
  let riddleModule = null;

  switch(intentName) {
    case 'riddleIntent':
    case 'launchIntent':
    riddleModule = new RiddleModule();
    break;

    case 'questionIntent':
    riddleModule = new QuestionModule();
    break;

    case 'storyIntent':
    riddleModule = new StoryModule();
    break;

    default:
    riddleModule = new RiddleModule();
    break;
  }
  return riddleModule;
};

// Launch Intent

app.launch((req, res) => {
  const deviceID = req.data.context.System.device.deviceId;
  const random = RandomModule.launch[ Math.floor(Math.random() * RandomModule.launch.length) ];
  let prompt, reprompt;

  return new Promise((resolve, reject) => {
    databaseHelper.readUserDetails(deviceID, (err, result) => {
      if(err) return reject(err);
      return resolve(result);
    });
  }).then((result) => {
    if (result !== undefined && result !== 'NO record found!!' && result.riddle_id === 0) {
      prompt = ` ${random}! and welcome back to Riddler. We’re happy you’re here. We have classic and fun riddles to make you think smarter. Would you like to listen to a riddle?`;
      reprompt = 'Our options on Alexa are riddles, question of the day, story puzzles. What would you like to play today?';
      return res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').shouldEndSession(false);
    } else if (result !== undefined && result !== 'NO record found!!' && result.riddle_id !== 0) {
      prompt = ` ${random}! and welcome back to Riddler. We’re happy you’re here. You were solving a riddle, ${result.riddle.question_title}. Would you like to listen to the riddle again?`;
      reprompt = `Would you like to solve the riddle, ${result.riddle.question_title}. Would you like to listen to it again?`;
      return res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').session('riddle', result.riddle).session('attempted_riddles', result.attempted_riddles).shouldEndSession(false);
    }
    prompt = 'Hello. Welcome to Riddler. These lovely little puzzle skill has classic and fun riddles to make you think smarter and crazier. What would you like to play today ? riddles, question of the day or story puzzles?';
    reprompt = 'Our options on Alexa are riddles, question of the day and story puzzles. What would you like to play today?';
    return res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').shouldEndSession(false);
  }).catch((err) => {
    console.error('❌ error during database invocation:', err);
    prompt = 'Sorry, we encountered a problem. Please, try again.';
    return res.say(prompt).shouldEndSession(true).send();
  });
});

// Generic Intent Module
const genericIntentModuleHandler = function(req, res, module) {
  const promise = module.intentResponse(req, res);

  return promise.then((results) => {
    results.cb(res);
  });
};

// Riddle Intent
app.intent('singleUtteranceIntent', {
  'slots': {
    'GenericSlot': 'GenericType'
  }
},
(req, res) => {
  let prompt, module;

  switch(req.session('intentName')) {
    case 'launchIntent':
    switch(req.slot('GenericSlot').toLowerCase()) {
      case 'riddle':
      case 'riddles':
      module = new RiddleModule().intentResponse(req, res);
      break;

      case 'story':
      module = new StoryModule().intentResponse(req, res);
      break;

      case 'question':
      module = new QuestionModule().intentResponse(req, res);
      break;

      default:
      prompt = "Im sorry, I didn't get that. Our options on Alexa are riddles, question of the day, story puzzles. You can say - play, followed by the section name. What would you like to play today?";
      res.say(prompt).shouldEndSession(false).clearSession(true);
      break;
    }
    break;

    case 'riddleIntent':
    module = new RiddleModule().intentResponse(req, res);
    break;

    case 'storyIntent':
    module = new StoryModule().intentResponse(req, res);
    break;

    case 'questionIntent':
    module = new QuestionModule().intentResponse(req, res);
    break;

    default:
    module = new RiddleModule().intentResponse(req, res);
    break;
  }
  return module;
}
);

// Riddle Hint Intent
app.intent('riddleHintIntent', (req, res) => {
  var prompt;
  if(res.session('riddle').hints.length === 0) {
    prompt = RandomModule.noHint[ Math.floor(Math.random() * RandomModule.meditationFirst.length) ]
  } else {
    prompt = res.session('riddle').hints[0];
  }
  const reprompt = 'If you want to listen to the riddle again, just say, Alexa repeat.'
  res.say(prompt).reprompt(reprompt).shouldEndSession(false);
});

app.intent('AMAZON.RepeatIntent', (req, res) => {
  const riddleSession = res.session('riddle')
  if(riddleSession !== undefined && riddleSession.riddle_id !== 0){
    const prompt = riddleSession.question + '. Who am I?';
    const reprompt = 'If you want to repeat the riddle, say - Alexa, repeat';
    res.say(prompt).reprompt(reprompt).shouldEndSession(false);
  }
});

// AMAZON YES Intent
app.intent('AMAZON.YesIntent', (req, res) => {
  let promise = null;
  const precedingIntentName = res.session('intentName'), riddleModule = getRiddleModuleByIntent(precedingIntentName);
  const deviceID = req.data.context.System.device.deviceId;

  if (riddleModule) {
    promise = riddleModule.yesIntentResponse(req, res);
    return promise.then((intentResponse) => {
      intentResponse.cb(res);
    });
  }
  const prompt = 'I am sorry, lets try from the beginning.';
  const cb = (response) => {
    response.say(prompt).shouldEndSession(false);
  };
  const intentResponse = {
    prompt,
    cb
  };

  intentResponse.cb(res);
});

// AMAZON NO Intent
app.intent('AMAZON.NoIntent', (req, res) => {
  let precedingIntentName = res.session('intentName');
  const riddleModule = getRiddleModuleByIntent(precedingIntentName);

  if (riddleModule) {
    intentResponse = riddleModule.noIntentResponse(req, res);
    return intentResponse.then((intentResponse) => {
      intentResponse.cb(res);
    });
  }
  const prompt = 'Okay. Thank You.';

  intentResponse = {
    prompt: prompt,
    cb: (response) => {
      response.say(prompt).shouldEndSession(true);
    }
  };
  intentResponse.cb(res);
});


// AMAZON Stop Intent
app.intent('AMAZON.StopIntent', (req, res) => {
  const prompt = 'Had a nice time talking to you. Goodbye.';

  res.say(prompt).shouldEndSession(true);
  res.clearSession(true);
});

module.exports = app;

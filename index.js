'use strict';
module.change_code = 1;
const Alexa = require('alexa-app');
const app = new Alexa.app('riddler');
const RiddleModule = require('./lib/RiddleModule');
const QuestionModule = require('./lib/QuestionModule');
const StoryModule = require('./lib/StoryModule');
const DatabaseHelper = require('./database_helper');
const RandomModule = require('./lib/RandomInsertsModule');
const SynonymsResolveModule = require('./lib/SynonymsResolveModule');
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
    if (result !== undefined && result !== 'NO record found!!' && result.riddle_id !== 0 && result.story_id !== 0) {
      if(result.last_played === 'riddle') {
        prompt = ` ${random}! and welcome back to Riddler. We’re happy you’re here. You were solving a riddle, ${result.riddle.question_title}. Would you like to solve this riddle again?`;
        reprompt = `Would you like to solve the riddle, ${result.riddle.question_title}. Would you like to listen to it again?`;
        return res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').session('riddle', result.riddle).session('puzzle_mode', 'riddle').session('attempted_riddles', result.attempted_riddles).session('prompt', prompt).shouldEndSession(false);
      } else if (result.last_played === 'story') {
        prompt = ` ${random}! and welcome back to Riddler. We’re happy you’re here. You were solving a mystery, ${result.story.question_title}. Would you like to solve this story again?`;
        reprompt = `Would you like to solve the mystery, ${result.story.question_title}. Would you like to listen to it again?`;
        return res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').session('story', result.story).session('puzzle_mode', 'story').session('attempted_stories', result.attempted_stories).session('prompt', prompt).shouldEndSession(false);
      }
    } else if (result !== undefined && result !== 'NO record found!!' && result.last_played === 'riddle') {
      prompt = ` ${random}! and welcome back to Riddler. We’re happy you’re here. You were solving a riddle, ${result.riddle.question_title}. Would you like to solve this riddle again?`;
      reprompt = `Would you like to solve the riddle, ${result.riddle.question_title}. Would you like to listen to it again?`;
      return res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').session('riddle', result.riddle).session('puzzle_mode', 'riddle').session('attempted_riddles', result.attempted_riddles).session('prompt', prompt).shouldEndSession(false);
    } else if (result !== undefined && result !== 'NO record found!!' && result.last_played === 'story') {
      prompt = ` ${random}! and welcome back to Riddler. We’re happy you’re here. You were solving a mystery, ${result.story.question_title}. Would you like to solve this story again?`;
      reprompt = `Would you like to solve the mystery, ${result.story.question_title}. Would you like to listen to it again?`;
      return res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').session('story', result.story).session('puzzle_mode', 'story').session('attempted_stories', result.attempted_stories).session('prompt', prompt).shouldEndSession(false);
    } else if (result !== undefined && result !== 'NO record found!!' && result.riddle_id === 0 && result.story_id === 0) {
      prompt = ` ${random}! and welcome back to Riddler. We’re happy you’re here. What would you like to play today? Riddles, or story puzzles?`;
      reprompt = 'Our options on Alexa are riddles and story puzzles. What would you like to play today?';
      return res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').session('prompt', prompt).shouldEndSession(false);
    }
    prompt = 'Hello. Welcome to Riddler. These lovely little puzzle skill has classic and fun riddles and mystery stories to make you think smarter and crazier. What would you like to play today? Riddles, or story puzzles?';
    reprompt = 'Our options on Alexa are riddles and story puzzles. What would you like to play today?';
    return res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').session('prompt', prompt).shouldEndSession(false);
  }).catch((err) => {
    console.error('❌ error during database invocation:', err);
    prompt = 'Sorry, we encountered a problem. Please, try again.';
    return res.say(prompt).shouldEndSession(true).send();
  });
});

// Riddle Intent
app.intent('singleUtteranceIntent', {
  // 'dialog': {
  //   type: 'delegate'
  // },
  'slots': {
    'GenericSlot': 'GenericType'
  }
}, (req, res) => {
  let prompt, module;

  console.log('inside single utterance intent:');
  switch(req.session('intentName')) {
    case 'launchIntent':
    switch(SynonymsResolveModule.extract('GenericSlot', req).toLowerCase()) {
      case 'riddle':
      case 'riddles':
      module = new RiddleModule().intentResponse(req, res);
      break;

      case 'story':
      case 'stories':
      module = new StoryModule().intentResponse(req, res);
      break;

      default:
      prompt = `I'm sorry, I didn't get that. Our options on Alexa are <break time="0.20s"/> riddles <break time="0.20s"/> and story puzzles. You can say <break time="0.20s"/>  play, followed by the section name. What would you like to play today?`;
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
});

// Riddle Hint Intent
app.intent('hintIntent', (req, res) => {
  let prompt, reprompt, noHint;

  if(req.session('puzzle_mode') === 'story') {
    reprompt = 'If you want to listen to the story again, just say, Alexa repeat.';
    noHint = req.data.request.locale = 'en-US' ? 'noHintStoryUS' : 'noHintStoryIN';

    if(res.session('story').hints.length === 0) {
      prompt = RandomModule[noHint][ Math.floor(Math.random() * RandomModule.noHint.length) ];
    } else {
      prompt = res.session('story').hints[0];
    }
  } else {
    reprompt = 'If you want to listen to the riddle again, just say, Alexa repeat.';
    noHint = req.data.request.locale = 'en-US' ? 'noHintRiddleUS' : 'noHintRiddleIN';
    
    if(res.session('riddle').hints.length === 0) {
      prompt = RandomModule[noHint][ Math.floor(Math.random() * RandomModule.noHint.length) ];
    } else {
      prompt = res.session('riddle').hints[0];
    }
  }
  res.say(prompt).reprompt(reprompt).shouldEndSession(false);
});

// Repeat the Riddle
app.intent('AMAZON.RepeatIntent', (req, res) => {
  const riddleSession = res.session('riddle');
  const storySession = res.session('story');
  let reprompt, prompt;
  
  if ('puzzle_mode' === 'riddle') {
    prompt = riddleSession.question;
    reprompt = 'If you are finding it tough, you can ask for hint or to answer the riddle, just say - Alexa, My answer is, followed by your answer.';
    res.say(prompt).reprompt(reprompt).shouldEndSession(false);
  } else if('puzzle_mode' === 'story') {
    prompt = storySession.question;
    reprompt = 'If you are finding it tough, you can ask for hint or to answer the story, just say - Alexa, My answer is, followed by your answer.';
    res.say(prompt).reprompt(reprompt).shouldEndSession(false);
  } else if(req.session('prompt') !== undefined) {
    prompt = req.session('prompt');
    res.say(prompt).reprompt(reprompt).shouldEndSession(false);
  } else {
    prompt = 'Hello. Welcome to Riddler. These lovely little puzzle skill has classic and fun riddles and mystery stories to make you think smarter and crazier. What would you like to play today? Riddles, or story puzzles?';
    res.say(prompt).reprompt(reprompt).shouldEndSession(false);
  }
});

// Dont know the answer
app.intent('dontKnowIntent', (req, res) => {
  const intentName = res.session('intentName');

  if (intentName === 'storyIntent') {
    const storySession = res.session('story');

    if(storySession !== undefined && storySession.story_id !== 0) {
      const prompt = `${RandomModule.stop[ Math.floor(Math.random() * RandomModule.stop.length) ]}. The answer is <break time=\"1.00s\"/> ${storySession.story_answer} <break time=\"2.00s\"/> ${RandomModule.storyAgain[ Math.floor(Math.random() * RandomModule.storyAgain.length) ]}`;
      const reprompt = 'Would you like to listen to another story?';

      res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
    }
  } else if (intentName === 'riddleIntent') {
    const riddleSession = res.session('riddle');

    if(riddleSession !== undefined && riddleSession.riddle_id !== 0) {
      const prompt = `${RandomModule.stop[ Math.floor(Math.random() * RandomModule.stop.length) ]}. The answer is <break time=\"1.00s\"/> ${riddleSession.riddle_answer} <break time=\"2.00s\"/> ${RandomModule.riddleAgain[ Math.floor(Math.random() * RandomModule.riddleAgain.length) ]}`;
      const reprompt = 'Would you like to listen to another riddle?';

      res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
    }
  }
});

// AMAZON YES Intent
app.intent('AMAZON.YesIntent', (req, res) => {
  let promise = null;
  let riddleModule = null;
  const precedingIntentName = res.session('intentName');

  if (precedingIntentName === 'launchIntent' && res.session('puzzle_mode') === 'story') {
    riddleModule = getRiddleModuleByIntent('storyIntent');
  } else if (precedingIntentName === 'launchIntent' && res.session('puzzle_mode') === 'riddle') {
    riddleModule = getRiddleModuleByIntent('riddleIntent');
  } else {
    riddleModule = getRiddleModuleByIntent(precedingIntentName);
  }

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
  let noIntentPromise = null;
  let riddleModule = null;
  let precedingIntentName = res.session('intentName');

  if (precedingIntentName === 'launchIntent' && res.session('puzzle_mode') === 'story') {
    riddleModule = getRiddleModuleByIntent('storyIntent');
  } else if (precedingIntentName === 'launchIntent' && res.session('puzzle_mode') === 'riddle') {
    riddleModule = getRiddleModuleByIntent('riddleIntent');
  } else {
    riddleModule = getRiddleModuleByIntent(precedingIntentName);
  }

  if (riddleModule) {
    noIntentPromise = riddleModule.noIntentResponse(req, res);
    return noIntentPromise.then((intentResponse) => {
      intentResponse.cb(res);
    });
  }
  const prompt = 'Okay. Thank You.';

  const intentResponse = {
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

// Amazon Help intnet
app.intent('AMAZON.HelpIntent', (req, res) => {
  const help = 'You\'re listening to Riddler. I have few fun riddles and stores for you. Once you\'re playing a puzzle, you can repeat, ask for hint or if the puzzle is too tough, just say - i dont know. What would you like to play today? Riddles, or story puzzles?';
  
  res.say(help).shouldEndSession(false);
});

module.exports = app;

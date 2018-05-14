module.change_code = 1;

const DatabaseHelper = require('../database_helper');
const databaseHelper = new DatabaseHelper();
const RandomModule = require('./RandomInsertsModule');
const GenericModule = require('./GenericModule');
const SynonymsResolveModule = require('./SynonymsResolveModule');

function StoryModule() {
  let prompt, cb, reprompt;

  this.intentResponse = function(req, res) {
    const deviceID = req.data.context.System.device.deviceId;
    const correctAnswerExpression = req.data.request.locale = 'en-US' ? 'correctAnswerExpressionUS' : 'correctAnswerExpressionIN';
    const wrongAnswerExpression = req.data.request.locale = 'en-US' ? 'wrongAnswerExpressionUS' : 'wrongAnswerExpressionIN';
    const riddle = req.session('riddle') || {};
    const riddle_id = req.session('riddle') === undefined ? 0 : req.session('riddle').riddle_id;
    const attempted_riddles = req.session('riddle') === undefined ? [] : req.session('riddle').attempted_riddles;
    const randomStoryId = GenericModule.getStoryId(res.session('attempted_stories')) || null;

    if (req.session('intentName') === 'storyIntent') {
      const storyAnswer = SynonymsResolveModule.extract('GenericSlot', req);

      let promise = new Promise((resolve, reject) => {
        databaseHelper.saveUserState(deviceID, riddle_id, riddle, attempted_riddles, req.session('story').story_id, req.session('story'), req.session('story').attempted_stories, 'story', (err, userResult) => {
          console.log('userResult:', userResult);
          if (err) return reject(err);
          return resolve(userResult);
        });
      });

      return promise.then((successMessage) => {
        if (req.session('story').answers.includes(storyAnswer.toLowerCase())) {
          prompt = `<say-as interpret-as="interjection">${RandomModule[correctAnswerExpression][ Math.floor(Math.random() * RandomModule[correctAnswerExpression].length) ]}</say-as>, your answer is correct. ${RandomModule.storyAgain[ Math.floor(Math.random() * RandomModule.storyAgain.length) ]}`;
          reprompt = 'Would you like to listen to another story?';
          return res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
        } else if (req.session('isAttemptLeft')) {
          prompt = `<say-as interpret-as="interjection">${RandomModule[wrongAnswerExpression][ Math.floor(Math.random() * RandomModule[wrongAnswerExpression].length) ]}</say-as>, that\'s not the correct answer. ${RandomModule.storyAnswerChance[ Math.floor(Math.random() * RandomModule.storyAnswerChance.length) ]}. If you need help, you can ask for hint. To answer the mystery story, just say - My answer is, followed by your answer.`;
          reprompt = 'If you are finding it tough, you can ask for hint <break time=\"0.50s\"/> or <break time=\"0.30s\"/> to answer the riddle, just say - Alexa, My answer is, followed by your answer.';
          return res.say(prompt).reprompt(reprompt).session('isAttemptLeft', false).shouldEndSession(false).send();
        }
        prompt = `<say-as interpret-as="interjection">${RandomModule[wrongAnswerExpression][ Math.floor(Math.random() * RandomModule[wrongAnswerExpression].length) ]}</say-as> The answer is, <break time=\"0.50s\"/> ${req.session('story').story_answer} <break time=\"2.00s\"/>  ${RandomModule.storyAgain[ Math.floor(Math.random() * RandomModule.storyAgain.length) ]}`;
        reprompt = 'Would you like to listen to another story?';
        return res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
      });
    }
    if (randomStoryId === undefined) {
      prompt = 'You have completed all stories of this week. Please return next week for new set of mystery stories. Until then, would you like to solve some riddles?';
      reprompt = 'Would you like to solve a riddle?';

      cb = function() {
        res.say(prompt).reprompt(reprompt).clearSession(true).session('intentName', 'riddleIntent').shouldEndSession(false);
      };

      return new Promise((resolve) => {
        resolve({ prompt, cb });
      });
    }
    return new Promise((resolve, reject) => {
      databaseHelper.readStoryQuestions(randomStoryId, (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      });
    }).then((result) => {
      console.log('result:', result);
      const startPrompt = `${RandomModule.launch[ Math.floor(Math.random() * RandomModule.launch.length) ]}  and welcome to Riddler. Here goes your mystery story. <break time=\'2.00s\'/>`;
      const timer = `<break time=\'0.90s\'/> You have <prosody volume=\'x-loud\'>10 </prosody> seconds to answer <break time=\'5.00s\'/> <prosody pitch=\'low\'>5</prosody>,<break time=\'0.90s\'/> <prosody pitch=\'low\'>4</prosody>,<break time=\'0.90s\'/> 3,<break time=\'0.90s\'/> <prosody volume=\'x-loud\'>2</prosody>,<break time=\'0.90s\'/> <prosody volume=\'x-loud\'>1</prosody>. <break time=\'1.00s\'/> Still haven\'t cracked the answer? Let me give you <prosody volume=\'x-loud\'>5</prosody> more seconds to answer.`;
      const attempted_stories = req.session('attempted_stories') || [];

      attempted_stories.push(result.story_id);

      prompt = startPrompt + result.question + timer;
      reprompt = 'If you want to repeat the story, just say, repeat. If you want to go to the next story or dont know the answer, just say, pass or next.';

      let promise = new Promise((resolve, reject) => {
        databaseHelper.saveUserState(deviceID, riddle_id, riddle, attempted_riddles, result.story_id, result, attempted_stories, 'story', (err, userResult) => {
          if (err) return reject(err);
          return resolve(userResult);
        });
      });

      return promise.then((successMessage) => {
        return res.say(prompt).reprompt(reprompt).session('story', result).session('intentName', 'storyIntent').session('isAttemptLeft', true).session('attempted_stories', attempted_stories).shouldEndSession(false);
      });
    }).catch((err) => {
      console.error('❌ error during database invocation:', err);
      prompt = 'Sorry, we encountered a problem. Please, try again.';
      return res.say(prompt).shouldEndSession(true).send();
    });
  };

  this.yesIntentResponse = function(req, res) {
    console.log('inside yes intent');
    const deviceID = req.data.context.System.device.deviceId;
    const riddle = req.session('riddle') || {};
    const riddle_id = req.session('riddle') === undefined ? 0 : req.session('riddle').riddle_id;
    const attempted_riddles = req.session('riddle') === undefined ? [] : req.session('riddle').attempted_riddles;

    console.log('intentName:', req.session('intentName'));
    console.log('story:', req.session('story'));

    if (res.session('intentName') === 'launchIntent' && req.session('story') !== undefined) {
      const result = req.session('story');
      const startPrompt = `Here goes your mystery. <break time=\"2.00s\"/>`;
      const timer = `<break time=\"0.90s\"/> You have <prosody volume=\"x-loud\">10 </prosody> seconds to answer <break time=\"5.00s\"/> <prosody pitch=\"low\">5</prosody>,<break time=\"0.90s\"/> <prosody pitch=\"low\">4</prosody>,<break time=\"0.90s\"/> 3,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">2</prosody>,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">1</prosody>. <break time=\"1.00s\"/> Think harder! Let me give you <prosody volume=\"x-loud\">5</prosody> more seconds to anwer.`;

      prompt = startPrompt + result.question + timer;
      reprompt = 'If you want to repeat the story, say - Alexa, repeat';

      cb = function() {
        res.say(prompt).reprompt(reprompt).session('story', result).session('intentName', 'storyIntent').session('isAttemptLeft', true).shouldEndSession(false);
      };

      return new Promise((resolve) => {
        resolve({ prompt, cb });
      });
    } else if(req.session('intentName') === 'storyIntent' && req.session('story') !== undefined) {
      const randomStoryId = GenericModule.getStoryId(res.session('attempted_stories'));

      if (randomStoryId === undefined) {
        prompt = 'You have completed all stories of this week. Please wait for another week for new set of mystery stories. Until then, would you like to solve some riddles?';
        reprompt = 'Would you like to solve a riddle?';

        cb = function() {
          res.say(prompt).reprompt(reprompt).clearSession(true).session('intentName', 'riddleIntent').shouldEndSession(false);
        };

        return new Promise((resolve) => {
          resolve({ prompt, cb });
        });
      }
      return new Promise((resolve, reject) => {
        databaseHelper.readStoryQuestions(GenericModule.getStoryId(res.session('attempted_stories')), (err, result) => {
          if (err) return reject(err);
          return resolve(result);
        });
      }).then((result) => {
        console.log('result:', result);
        const startPrompt = `Here goes your next story. <break time=\"2.00s\"/>`;
        const attempted_stories = req.session('attempted_stories');
        const timer = `<break time=\"0.90s\"/> You have <prosody volume=\"x-loud\">10 </prosody> seconds to answer <break time=\"5.00s\"/> <prosody pitch=\"low\">5</prosody>,<break time=\"0.90s\"/> <prosody pitch=\"low\">4</prosody>,<break time=\"0.90s\"/> 3,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">2</prosody>,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">1</prosody>. <break time=\"1.00s\"/> Think harder! Let me give you <prosody volume=\"x-loud\">5</prosody> more seconds to anwer.`;

        attempted_stories.push(result.story_id);
        prompt = startPrompt + result.question + timer;
        reprompt = 'If you want to repeat the story, say - Alexa, repeat';

        let saveUserStatePromise = new Promise((resolve, reject) => {
          databaseHelper.saveUserState(deviceID, riddle_id, riddle, attempted_riddles, result.story_id, result, attempted_stories, 'story', (err, userResult) => {
            if (err) return reject(err);
            return resolve(userResult);
          });
        });

        return saveUserStatePromise.then((successMessage) => {
          cb = function() {
            res.say(prompt).reprompt(reprompt).session('story', result).session('intentName', 'storyIntent').session('attempted_stories', attempted_stories).session('isAttemptLeft', true).shouldEndSession(false);
          };

          return new Promise((resolve) => {
            resolve({ prompt, cb });
          });
        });
      }).catch((err) => {
        console.error('❌ error during database invocation:', err);
        prompt = 'Sorry, we encountered a problem. Please, try again.';
        return res.say(prompt).shouldEndSession(true).send();
      });
    }
    prompt = 'What would you like to play today? Riddles, question of the day or story puzzles?'
    reprompt = 'Our options on Alexa are riddles, question of the day and story puzzles. What would you like to play today?';

    cb = function() {
      res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').shouldEndSession(false);
    };

    return new Promise((resolve) => {
      resolve({ prompt, cb });
    });
  };

  this.noIntentResponse = function(req, res) {
    if (res.session('intentName') === 'launchIntent' && req.session('story') != undefined) {
      const result = req.session('story');
      const startPrompt = `${RandomModule.newRiddle[ Math.floor(Math.random() * RandomModule.newRiddle.length) ]} <break time=\"3.00s\"/>`;

      prompt = startPrompt + result.question + endPrompt;
      reprompt = 'If you want to repeat the story, say - Alexa, repeat';

      cb = function() {
        res.say(prompt).reprompt(reprompt).session('story', result).session('intentName', 'storyIntent').session('isAttemptLeft', true).shouldEndSession(false);
      };

      return new Promise((resolve) => {
        resolve({ prompt, cb });
      });
    } else if (req.session('story') === undefined) {
      prompt = 'What would you like to play today? Riddles, question of the day or story puzzles?';
      reprompt = 'Our options on Alexa are riddles, question of the day and story puzzles. What would you like to play today?';

      cb = function() {
        res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').shouldEndSession(false);
      };

      return new Promise((resolve) => {
        resolve({ prompt, cb });
      });
    }
    prompt = `${RandomModule.stop[ Math.floor(Math.random() * RandomModule.stop.length) ]}. Thank You.`;
    cb = function() {
      res.say(prompt).shouldEndSession(true).clearSession(true);
    };
    return new Promise((resolve) => {
      resolve({ prompt, cb });
    });
  };
};

module.exports = StoryModule;

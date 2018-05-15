module.change_code = 1;

const DatabaseHelper = require('../database_helper');
const databaseHelper = new DatabaseHelper();
const RandomModule = require('./RandomInsertsModule');
const GenericModule = require('./GenericModule');
const SynonymsResolveModule = require('./SynonymsResolveModule');


function RiddleModule() {
  let prompt, cb, reprompt;

  this.intentResponse = function(req, res) {
    const deviceID = req.data.context.System.device.deviceId;
    const correctAnswerExpression = req.data.request.locale = 'en-US' ? 'correctAnswerExpressionUS' : 'correctAnswerExpressionIN';
    const wrongAnswerExpression = req.data.request.locale = 'en-US' ? 'wrongAnswerExpressionUS' : 'wrongAnswerExpressionIN';
    const story = req.session('story') || {};
    const story_id = req.session('story') === undefined ? 0 : req.session('story').story_id;
    const attempted_stories = req.session('attempted_stories') === undefined ? [] : req.session('attempted_stories');
    const randomRiddleId = res.session('attempted_riddles') === undefined ? GenericModule.getRiddleId(null) : GenericModule.getRiddleId(res.session('attempted_riddles'));

    if (req.session('intentName') === 'riddleIntent') {
      const riddleAnswer = SynonymsResolveModule.extract('GenericSlot', req);
      console.log('riddleAnswer', riddleAnswer);

      let promise = new Promise((resolve, reject) => {
        databaseHelper.saveUserState(deviceID, req.session('riddle').riddle_id, req.session('riddle'), req.session('attempted_riddles'), story_id, story, attempted_stories, 'riddle', (err, userResult) => {
          console.log('userResult:', userResult);
          if (err) return reject(err);
          return resolve(userResult);
        });
      });

      return promise.then((successMessage) => {
        if (req.session('riddle').answers.includes(riddleAnswer.toLowerCase())) {
          prompt = `<say-as interpret-as="interjection">${RandomModule[correctAnswerExpression][ Math.floor(Math.random() * RandomModule[correctAnswerExpression].length) ]}</say-as>, your answer is correct. ${RandomModule.riddleAgain[ Math.floor(Math.random() * RandomModule.riddleAgain.length) ]}`;
          reprompt = 'Would you like to listen to another riddle?';
          return res.say(prompt).reprompt(reprompt).session('riddle_answered', true).shouldEndSession(false).send();
        } else if (req.session('isAttemptLeft')) {
          prompt = `<say-as interpret-as="interjection">${RandomModule[wrongAnswerExpression][ Math.floor(Math.random() * RandomModule[wrongAnswerExpression].length) ]}</say-as>, that\'s not the correct answer. ${RandomModule.answerChange[ Math.floor(Math.random() * RandomModule.answerChange.length) ]}. If you need help, you can ask for hint. To answer the riddle, just say - My answer is, followed by your answer.`;
          reprompt = 'If you are finding it tough, you can ask for hint <break time=\"0.50s\"/> or <break time=\"0.30s\"/> to answer the riddle, just say - Alexa, My answer is, followed by your answer.';
          return res.say(prompt).reprompt(reprompt).session('riddle_answered', false).session('isAttemptLeft', false).shouldEndSession(false).send();
        }
        prompt = `<say-as interpret-as="interjection">${RandomModule[wrongAnswerExpression][ Math.floor(Math.random() * RandomModule[wrongAnswerExpression].length) ]}</say-as> thats the wrong answer! The answer is, ${req.session('riddle').riddle_answer} <break time=\"2.00s\"/>  ${RandomModule.riddleAgain[ Math.floor(Math.random() * RandomModule.riddleAgain.length) ]}`;
        reprompt = 'Would you like to listen to another riddle?';
        return res.say(prompt).reprompt(reprompt).session('riddle_answered', true).shouldEndSession(false).send();
      });
    }
    return new Promise((resolve, reject) => {
      databaseHelper.readRiddleQuestions(randomRiddleId, (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      });
    }).then((result) => {
      console.log('result:', result);
      const startPrompt = `${RandomModule.launch[ Math.floor(Math.random() * RandomModule.launch.length) ]}  and welcome to Riddler. Here goes your riddle. <break time=\"2.00s\"/>`;
      const attempted_riddles = req.session('attempted_riddles') || [];
      const timer = `<break time=\"0.90s\"/> You have <prosody volume=\"x-loud\">10 </prosody> seconds to answer <break time=\"5.00s\"/> <prosody pitch=\"low\">5</prosody>,<break time=\"0.90s\"/> <prosody pitch=\"low\">4</prosody>,<break time=\"0.90s\"/> 3,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">2</prosody>,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">1</prosody>. <break time=\"1.00s\"/> Think harder! Let me give you <prosody volume=\"x-loud\">5</prosody> more seconds to answer.`;
      
      attempted_riddles.push(result.riddle_id);
      prompt = startPrompt + result.question + timer;
      reprompt = RandomModule.takeTime[ Math.floor(Math.random() * RandomModule.takeTime.length) ];

      let promise = new Promise((resolve, reject) => {
        databaseHelper.saveUserState(deviceID, result.riddle_id, result, attempted_riddles, story_id, story, attempted_stories, 'riddle', (err, userResult) => {
          if (err) return reject(err);
          return resolve(userResult);
        });
      });

      return promise.then((successMessage) => {
        return res.say(prompt).reprompt(reprompt).session('riddle', result).session('intentName', 'riddleIntent').session('riddle_answered', false).session('isAttemptLeft', true).session('attempted_riddles', attempted_riddles).shouldEndSession(false);
      });
    }).catch((err) => {
      console.error('❌ error during database invocation:', err);
      prompt = 'Sorry, we encountered a problem. Please, try again.';
      return res.say(prompt).shouldEndSession(true).send();
    });
  };

  this.yesIntentResponse = function(req, res) {
    const deviceID = req.data.context.System.device.deviceId;
    const story = req.session('story') || {};
    const story_id = req.session('story') === undefined ? 0 : req.session('story').story_id;
    const attempted_stories = req.session('attempted_stories') === undefined ? [] : req.session('attempted_stories');

    if (res.session('intentName') === 'launchIntent' && req.session('riddle') !== undefined) {
      const result = req.session('riddle');
      const startPrompt = `Here goes your riddle. <break time=\'2.00s\'/>`;
      const timer = `<break time=\'0.90s\'/> You have <prosody volume=\'x-loud\'>10 </prosody> seconds to answer <break time=\'5.00s\'/> <prosody pitch=\'low\'>5</prosody>,<break time=\'0.90s\'/> <prosody pitch=\'low\'>4</prosody>,<break time=\'0.90s\'/> 3,<break time=\'0.90s\'/> <prosody volume=\'x-loud\'>2</prosody>,<break time=\'0.90s\'/> <prosody volume=\'x-loud\'>1</prosody>. <break time=\'1.00s\'/> Think harder! Let me give you <prosody volume=\'x-loud\'>5</prosody> more seconds to answer.`;

      prompt = startPrompt + result.question + timer;
      reprompt = 'If you want to repeat the riddle, say - Alexa, repeat';

      cb = function() {
        res.say(prompt).reprompt(reprompt).session('riddle', result).session('intentName', 'riddleIntent').session('isAttemptLeft', true).shouldEndSession(false);
      };

      return new Promise((resolve) => {
        resolve({ prompt, cb });
      });
    } else if(req.session('intentName') === 'riddleIntent' && req.session('riddle') !== undefined) {
      const randomRiddleId = res.session('attempted_riddles') === undefined ? GenericModule.getRiddleId(null) : GenericModule.getRiddleId(res.session('attempted_riddles'));

      if (randomRiddleId === undefined) {
        prompt = 'You have completed all riddles of this week. Please return next week for new set of mystery stories. Until then, would you like to solve some mystery stories?';
        reprompt = 'Would you like to solve some mystery stories?';

        cb = function() {
          res.say(prompt).reprompt(reprompt).clearSession(true).session('intentName', 'riddleIntent').shouldEndSession(false);
        };

        return new Promise((resolve) => {
          resolve({ prompt, cb });
        });
      } else if (req.session('riddle_answered') === false) {
        prompt = `You have <prosody volume=\"x-loud\">10 </prosody> seconds to answer <break time=\"5.00s\"/> <prosody pitch=\"low\">5</prosody>,<break time=\"0.90s\"/> <prosody pitch=\"low\">4</prosody>,<break time=\"0.90s\"/> 3,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">2</prosody>,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">1</prosody>. <break time=\"1.00s\"/> Think harder! Let me give you <prosody volume=\"x-loud\">5</prosody> more seconds to answer.`;
        reprompt = RandomModule.takeTime[ Math.floor(Math.random() * RandomModule.takeTime.length) ];
        
        cb = function() {
          res.say(prompt).reprompt(reprompt).session('intentName', 'riddleIntent').shouldEndSession(false);
        };

        return new Promise((resolve) => {
          resolve({ prompt, cb });
        });
      }
      return new Promise((resolve, reject) => {
        databaseHelper.readRiddleQuestions(randomRiddleId, (err, result) => {
          if (err) return reject(err);
          return resolve(result);
        });
      }).then((result) => {
        console.log('result:', result);
        const startPrompt = `Here goes your next riddle. <break time=\"2.00s\"/>`;
        const attempted_riddles = req.session('attempted_riddles') || [];
        const timer = `<break time=\"0.90s\"/> You have <prosody volume=\"x-loud\">10 </prosody> seconds to answer <break time=\"5.00s\"/> <prosody pitch=\"low\">5</prosody>,<break time=\"0.90s\"/> <prosody pitch=\"low\">4</prosody>,<break time=\"0.90s\"/> 3,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">2</prosody>,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">1</prosody>. <break time=\"1.00s\"/> Think harder! Let me give you <prosody volume=\"x-loud\">5</prosody> more seconds to answer.`;

        attempted_riddles.push(result.riddle_id);
        prompt = startPrompt + result.question + timer;
        reprompt = RandomModule.takeTime[ Math.floor(Math.random() * RandomModule.takeTime.length) ];

        let saveUserStatePromise = new Promise((resolve, reject) => {
          databaseHelper.saveUserState(deviceID, result.riddle_id, result, attempted_riddles, story_id, story, attempted_stories, 'riddle', (err, userResult) => {
            if (err) return reject(err);
            return resolve(userResult);
          });
        });

        return saveUserStatePromise.then((successMessage) => {
          cb = function() {
            res.say(prompt).reprompt(reprompt).session('riddle', result).session('intentName', 'riddleIntent').session('attempted_riddles', attempted_riddles).session('isAttemptLeft', true).shouldEndSession(false);
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
    } else if(req.session('intentName') === 'riddleIntent') {
      // if story is empty and play riddles
      console.log('inside yes intent');
      const randomRiddleId = GenericModule.getRiddleId(null);

      if (randomRiddleId === undefined) {
        prompt = 'You have completed all riddles of this week. Please wait for another week for new set of riddles. Thank you!';

        cb = function() {
          res.say(prompt).clearSession(true).shouldEndSession(true);
        };

        return new Promise((resolve) => {
          resolve({ prompt, cb });
        });
      }
      return new Promise((resolve, reject) => {
        databaseHelper.readRiddleQuestions(randomRiddleId, (err, result) => {
          if (err) return reject(err);
          return resolve(result);
        });
      }).then((result) => {
        console.log('result:', result);
        const startPrompt = `Here goes your next riddle. <break time=\"2.00s\"/>`;
        const attempted_riddles = req.session('attempted_riddles') || [];
        const timer = `<break time=\"0.90s\"/> You have <prosody volume=\"x-loud\">10 </prosody> seconds to answer <break time=\"5.00s\"/> <prosody pitch=\"low\">5</prosody>,<break time=\"0.90s\"/> <prosody pitch=\"low\">4</prosody>,<break time=\"0.90s\"/> 3,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">2</prosody>,<break time=\"0.90s\"/> <prosody volume=\"x-loud\">1</prosody>. <break time=\"1.00s\"/> Think harder! Let me give you <prosody volume=\"x-loud\">5</prosody> more seconds to answer.`;

        attempted_riddles.push(result.riddle_id);
        prompt = startPrompt + result.question + timer;
        reprompt = RandomModule.takeTime[ Math.floor(Math.random() * RandomModule.takeTime.length) ];

        let saveUserStatePromise = new Promise((resolve, reject) => {
          databaseHelper.saveUserState(deviceID, result.riddle_id, result, attempted_riddles, story_id, story, attempted_stories, 'riddle', (err, userResult) => {
            if (err) return reject(err);
            return resolve(userResult);
          });
        });

        return saveUserStatePromise.then((successMessage) => {
          cb = function() {
            res.say(prompt).reprompt(reprompt).session('riddle', result).session('intentName', 'riddleIntent').session('attempted_riddles', attempted_riddles).session('isAttemptLeft', true).shouldEndSession(false);
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
    prompt = 'What would you like to play today? Riddles or story puzzles?';
    reprompt = 'Our options on Alexa are riddles and story puzzles. What would you like to play today?';

    cb = function() {
      res.say(prompt).reprompt(reprompt).session('intentName', 'launchIntent').shouldEndSession(false);
    };

    return new Promise((resolve) => {
      resolve({ prompt, cb });
    });
  };

  this.noIntentResponse = function(req, res) {

    // if (res.session('intentName') === 'launchIntent' && req.session('riddle') !== undefined) {
    //   const result = req.session('riddle');
    //   const startPrompt = `${RandomModule.newRiddle[ Math.floor(Math.random() * RandomModule.newRiddle.length) ]} <break time=\"3.00s\"/>`;

    //   prompt = startPrompt + result.question + endPrompt;
    //   reprompt = 'If you want to repeat the riddle, say - Alexa, repeat';

    //   cb = function() {
    //     res.say(prompt).reprompt(reprompt).session('riddle', result).session('intentName', 'riddleIntent').session('isAttemptLeft', true).shouldEndSession(false);
    //   };

    //   return new Promise((resolve) => {
    //     resolve({ prompt, cb });
    //   });
    // } else{}

    if (req.session('riddle') === undefined || res.session('intentName') === 'launchIntent') {
      prompt = 'What would you like to play today? Riddles or story puzzles?';
      reprompt = 'Our options on Alexa are riddles and story puzzles. What would you like to play today?';

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
}

module.exports = RiddleModule;

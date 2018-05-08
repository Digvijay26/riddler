module.change_code = 1;

const DatabaseHelper = require('../database_helper');
const databaseHelper = new DatabaseHelper();
const RandomModule = require('./RandomInsertsModule');
const GenericModule = require('./GenericModule');

function RiddleModule() {
  let prompt, cb, reprompt;

  this.intentResponse = function(req, res) {
    const intentName = req.data.request.intent.name;
    const deviceID = req.data.context.System.device.deviceId;
    if (req.session('intentName') === 'riddleIntent') {
      const riddleAnswer = req.slot('GenericSlot');

      let promise = new Promise((resolve, reject) => {
        databaseHelper.saveUserState(deviceID, req.session('riddle').riddle_id, req.session('riddle'), req.session('riddle').attempted_riddles, (err, userResult) => {
          console.log('userResult:', userResult);
          if (err) return reject(err);
          return resolve(userResult);
        });
      });

      return promise.then((successMessage) => {
        if (req.session('riddle').answers.includes(riddleAnswer.toLowerCase())) {
          prompt = `<say-as interpret-as="interjection">${RandomModule.correctAnswerExpression[ Math.floor(Math.random() * RandomModule.meditationFirst.length) ]}</say-as>, your answer is correct. ${RandomModule.riddleAgain[ Math.floor(Math.random() * RandomModule.meditationFirst.length) ]}`;
          reprompt = 'Would you like to listen to another riddle?'  
          return res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
        } else if (req.session('isAttemptLeft')) {
          prompt = `<say-as interpret-as="interjection">${RandomModule.wrongAnswerExpression[ Math.floor(Math.random() * RandomModule.meditationFirst.length) ]}</say-as>, that\'s not the correct answer. ${RandomModule.answerChange[ Math.floor(Math.random() * RandomModule.meditationFirst.length) ]}. If you need help, you can ask for hint. To answer the riddle, just say - My answer is, followed by your answer.`;
          reprompt = 'If you are finding it tough, you can ask for hint or to answer the riddle, just say - Alexa, My answer is, followed by your answer.'
          return res.say(prompt).reprompt(reprompt).session('isAttemptLeft', false).shouldEndSession(false).send();
        } else {
          prompt = `<say-as interpret-as="interjection">${RandomModule.wrongAnswerExpression[ Math.floor(Math.random() * RandomModule.meditationFirst.length) ]}</say-as> The answer is, ${req.session('riddle').riddle_answer} ${RandomModule.riddleAgain[ Math.floor(Math.random() * RandomModule.meditationFirst.length) ]}`;
          reprompt = 'Would you like to listen to another riddle?'
          return res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
        }
      });
    }
    return new Promise((resolve, reject) => {
      databaseHelper.readRiddleQuestions(GenericModule.getRiddleId(null), (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      });
    }).then((result) => {
      console.log('result:', result);
      const staryPrompt = `${RandomModule.launch[ Math.floor(Math.random() * RandomModule.meditationFirst.length) ]}  and welcome to Riddler. Here goes your next riddle. <break time=\"3.00s\"/>`;
      const endPrompt = '. Who am I?';
      const attempted_riddles = [result.riddle_id];

      prompt = staryPrompt + result.question + endPrompt;
      reprompt = 'If you want to repeat the riddle, say - Alexa, repeat';

      let promise = new Promise((resolve, reject) => {
        databaseHelper.saveUserState(deviceID, result.riddle_id, result, attempted_riddles, (err, userResult) => {
          if (err) return reject(err);
          return resolve(userResult);
        });
      });

      return promise.then((successMessage) => {
        return res.say(prompt).reprompt(reprompt).session('riddle', result).session('intentName', 'riddleIntent').session('isAttemptLeft', true).session('attempted_riddles', attempted_riddles).shouldEndSession(false);
      });
    }).catch((err) => {
      console.error('❌ error during database invocation:', err);
      prompt = 'Sorry, we encountered a problem. Please, try again.';
      return res.say(prompt).shouldEndSession(true).send();
    });
  };

  this.yesIntentResponse = function(req, res) {
    const deviceID = req.data.context.System.device.deviceId;

    if (res.session('intentName') === 'launchIntent') {
      const result = req.session('riddle');
      const attempted_riddles = req.session('attempted_riddles');
      const staryPrompt = `Here goes your riddle. <break time=\"3.00s\"/>`;
      const endPrompt = '. Who am I?';

      prompt = staryPrompt + result.question + endPrompt;
      reprompt = 'If you want to repeat the riddle, say - Alexa, repeat';

      cb = function(res) {
        res.say(prompt).reprompt(reprompt).session('riddle', result).session('intentName', 'riddleIntent').session('isAttemptLeft', true).shouldEndSession(false);
      };

      return new Promise((resolve) => {
        resolve({prompt, cb});
      });
    } else if(req.session('intentName') === 'riddleIntent') {
      return new Promise((resolve, reject) => {
        databaseHelper.readRiddleQuestions(GenericModule.getRiddleId(res.session('attempted_riddles')), (err, result) => {
          if (err) return reject(err);
          return resolve(result);
        });
      }).then((result) => {
        console.log('result:', result);
        const staryPrompt = `Here goes your next riddle. <break time=\"3.00s\"/>`;
        const attempted_riddles = req.session('attempted_riddles')
        attempted_riddles.push(result.riddle_id)
        prompt = staryPrompt + result.question;
        reprompt = 'If you want to repeat the riddle, say - Alexa, repeat';

        let saveUserStatePromise = new Promise((resolve, reject) => {
          databaseHelper.saveUserState(deviceID, result.riddle_id, result, attempted_riddles, (err, userResult) => {
            if (err) return reject(err);
            return resolve(userResult);
          });
        });

        return saveUserStatePromise.then((successMessage) => {
          cb = function(res) {
            res.say(prompt).reprompt(reprompt).session('riddle', result).session('intentName', 'riddleIntent').session('attempted_riddles', attempted_riddles).session('isAttemptLeft', true).shouldEndSession(false);
          };

          return new Promise((resolve) => {
            resolve({prompt, cb});
          });
        });
      }).catch((err) => {
        console.error('❌ error during database invocation:', err);
        prompt = 'Sorry, we encountered a problem. Please, try again.';
        return res.say(prompt).shouldEndSession(true).send();
      });
    }
  };

  this.noIntentResponse = function() {
    prompt = `${RandomModule.stop[ Math.floor(Math.random() * RandomModule.meditationFirst.length) ]}. Thank You.`;
    cb = function(res) {
      res.say(prompt).shouldEndSession(true).clearSession(true);
    };
    return new Promise((resolve) => {
      resolve({prompt, cb});
    });
  };

  this.getHint = function(req, res){

  }
}

module.exports = RiddleModule;

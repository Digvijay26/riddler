module.change_code = 1;

StoryModule = () => {
  let prompt, cb, reprompt;

  this.intentResponse = function(req) {
    const intentName = req.data.request.intent.name;
    const deviceID = req.data.context.System.device.deviceId;
    
    prompt = req.slot('GenericType');

    cb = function(res) {
      res.say(prompt);
    };

    return new Promise((resolve) => {
      resolve({prompt, cb});
    });
  };

  this.yesIntentResponse = function(req) {
    if (req.session('yes') === 'ask') {
      let announcement = req.session('announcement');

      prompt = '';
      for (let message in announcement) {
        message = parseInt(message);
        prompt = prompt + ' - ' + announcement[ message ].description + '. ';
      }
      reprompt = 'Do you need assistance with anything else?';

      cb = function(res) {
        res.say(prompt).reprompt(reprompt).shouldEndSession(false).session('yes', 'tell');
      };

      return new Promise((resolve) => {
        resolve({prompt, cb});
      });
    } else if(req.session('yes') === 'tell') {
      prompt = 'You can make a reservation, schedule a maintenance request or check the upcomming events. How may I help you ?';

      cb = function(res) {
        res.say(prompt).shouldEndSession(false).clearSession(true);
      };

      return new Promise((resolve) => {
        resolve({prompt, cb});
      });
    }
  };

  this.noIntentResponse = function() {
    prompt = 'Okay. Thank You.';
    cb = function(res) {
      res.say(prompt).shouldEndSession(true).clearSession(true);
    };
    return new Promise((resolve) => {
      resolve({prompt, cb});
    });
  };

};

module.exports = StoryModule;

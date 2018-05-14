module.change_code = 1;

module.exports = {
  getRiddleId: function(attemptedRiddles) {
    console.log('inside riddle id');
    const totalRiddles = 32;
    const riddleIdArray = [...Array(totalRiddles + 1).keys()].filter(item => ![0].includes(item));

    if (attemptedRiddles !== null) {
      const unreadRiddleArray = riddleIdArray.filter(item => !attemptedRiddles.includes(item));

      console.log('riddle_id:', unreadRiddleArray[Math.floor(Math.random() * unreadRiddleArray.length)]);
      return unreadRiddleArray[Math.floor(Math.random() * unreadRiddleArray.length)];
    }
    // return undefined;
    return riddleIdArray[Math.floor(Math.random() * riddleIdArray.length)];
  },

  getStoryId: function(attemptedStories) {
    console.log('inside story id');
    console.log('attemptedStories:', attemptedStories);
    const totalStories = 3;
    const storyIdArray = [...Array(totalStories + 1).keys()].filter(item => ![0].includes(item));
    
    if (attemptedStories !== null) {
      const unreadStoryArray = storyIdArray.filter(item => !attemptedStories.includes(item));
      
      console.log('story_id:', unreadStoryArray[Math.floor(Math.random() * unreadStoryArray.length)]);
      return unreadStoryArray[Math.floor(Math.random() * unreadStoryArray.length)];
    }
    return storyIdArray[Math.floor(Math.random() * storyIdArray.length)];
  }
};

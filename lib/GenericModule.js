module.change_code = 1;

module.exports = {
  getRiddleId: function(attemptedRiddles) {
    const totalRiddles = 32;
    const riddleIdArray = [...Array(33).keys()].filter(item => ![0].includes(item));
    if (attemptedRiddles !== null) {
      const unreadRiddleArray = riddleIdArray.filter(item => !attemptedRiddles.includes(item));
      return unreadRiddleArray[Math.floor(Math.random() * unreadRiddleArray.length)];
    }
    return riddleIdArray[Math.floor(Math.random() * riddleIdArray.length)];
  }
}

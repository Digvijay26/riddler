module.change_code = 1;
var unidecode = require('unidecode');
const lodash = require('lodash');

module.exports = {
  extract: function(slot_name, req) {
    let slotsObject = req.slots[slot_name];
    let resolution = (lodash.has(slotsObject, 'resolutions') && slotsObject.resolutions.length > 0) ? slotsObject.resolutions[0] : null;
    if(resolution && resolution.status == 'ER_SUCCESS_MATCH'){
      return resolution.values[0].name;
    } else if (req.slot(slot_name)){
      return unidecode(req.slot(slot_name));
    } else {
      return null;
    }
  }
};
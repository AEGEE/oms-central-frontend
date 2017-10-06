const queryServices = require('./queryServices.js');
const parse = require('./parse.js');

module.exports = (callback) => {
  queryServices((services) => {
    return callback({
      local: ['assets/css/*.css'],
      remote: parse.css(services)
    })
  })
}
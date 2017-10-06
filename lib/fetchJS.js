const queryServices = require('./queryServices.js');
const parse = require('./parse.js');

module.exports = (callback) => {
  queryServices((services) => {
    return callback({
      local: ['assets/js/*.js'],
      remote: parse.js(services)
    })
  })
}
const request = require('request')
const config = require('./config.json')

module.exports = (callback) => {
  request({
    url: config.registry_url + '/services',
    method: 'GET',
    json: true
  }, (error, response, body) => {
    if(error || !body.success) {
      console.log("Could not contact registry", error)
      return callback([]);
    }
    
    const tmp = body.data.filter((item) => {return item.modules && item.modules != [];})

    return callback(tmp)
  });
}
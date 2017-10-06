const queryServices = require('./queryServices.js');
const parse = require('./parse.js');

function getMetaTags() {
  return [
  {name: "Organisation", content: "AEGEE"},
  {name: "version", content: "0.0.1"}
  ]
}

function getExternalCSS() {
  return ['//fonts.googleapis.com/css?family=Open+Sans:300,400,600,700'];
}

function getExternalJS() {
  return []
}

function getBaseUrls() {
  return [{
    service: "central-frontend",
    url: "/"
  }]
}

function getModuleNames() {
  return ['ui.router',
      'ui.bootstrap',
      'public.welcome'];
}

module.exports = function(callback) {
  queryServices((services) => {
    return callback({
      appName: "yes it works",
      metaTags: getMetaTags(),
      externalCSS: getExternalCSS(),
      externalJS: getExternalJS(),
      angularModules: getModuleNames(services),
      baseUrlRepo: getBaseUrls(services),
      internalCSS: parse.css(services),
      internalJS: parse.js(services),
      debugBuild: true
    });
  });
}
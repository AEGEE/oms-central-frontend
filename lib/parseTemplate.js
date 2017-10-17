const config = require('./config.json');
const static = require('./static.json');


function getBaseUrls(services) {
  var retval=[];
  services.forEach((service) => {
    if(service.modules && service.modules.code) {
      retval.push({
        code: service.modules.code,
        url: service.frontend_url
      });
    }
  });

  return retval;
}

function getModuleNames(services, deps) {
  var retval = static.modules.concat(deps.module);

  services.forEach((service) => {
    // parse modules from microservice
    if(service.modules && service.modules.pages && Array.isArray(service.modules.pages)) {
      service.modules.pages.forEach((page) => {
        retval.push('app.' + page.code);
      });
    }
  });

  return retval;
}

function getPages(services) {
  return []
}

module.exports = function(services, css, js, deps) {
  return {
    appName: static.appName,
    metaTags: static.metaTags,
    externalCSS: static.externalCSS,
    externalJS: static.externalJS,
    angularModules: getModuleNames(services, deps),
    baseUrlRepo: getBaseUrls(services),
    internalCSS: config.devMode ? css.remote : [],
    internalJS: config.devMode ? js.remote : [],
    pages: getPages(services),
    devMode: config.devMode,
    debugBuild: true
  };
}
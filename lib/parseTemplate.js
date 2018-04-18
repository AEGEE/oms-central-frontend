const config = require('./config.json');
const static = require('./static.json');


function getBaseUrls(services) {
  var retval=[];
  services.forEach((service) => {
    if(service.modules && service.modules.code) {
      retval.push({
        code: service.modules.code,
        url: service.frontend_url + '/'
      });
    }
  });

  return retval;
}

function getModuleNames(services, deps) {
  var retval = deps.module.concat(static.modules);

  services.forEach((service) => {
    // parse modules from microservice
    if(service.modules && service.modules.pages && Array.isArray(service.modules.pages)) {
      service.modules.pages.forEach((page) => {
        retval.push('app.' + page.code);
      });
    }

    if(service.modules && service.modules.modules && Array.isArray(service.modules.modules)) {
      retval = retval.concat(service.modules.modules);
    }
  });

  return retval;
}

function getVisibleModules(services) {
  return services
    .filter((item) => {return !static.blacklistedModules.some((x) => {return item.name == x || item.modules.code == x})})
    .filter((item) => {return item.modules && item.enabled && item.modules.name && item.modules.pages && item.modules.pages.length;})
    .map((item) => {return item.modules;})
    .concat(static.defaultModules)
    .sort((a, b) => {
      const posa = a.menu_position || 9999999;
      const posb = b.menu_position || 9999999;
      return posa > posb;
    })
}

module.exports = function(services, css, js, deps) {
  return {
    appName: static.appName,
    templateConstants: static.templateConstants,
    metaTags: static.metaTags,
    externalCSS: static.externalCSS,
    externalJS: static.externalJS,
    angularModules: getModuleNames(services, deps),
    baseUrlRepo: getBaseUrls(services),
    internalCSS: config.devMode ? css.remote : [],
    internalJS: config.devMode ? js.remote : [],
    modules: getVisibleModules(services),
    devMode: config.devMode,
    copyright: '&copy; 2017 AEGEE',
    version: '0.0.1',
    debugBuild: true
  };
}
const js = function(services) {
  var remote = [];
  var local = [];
  services.forEach((service) => {
    if(service.modules && service.modules.js && service.modules.js != [] && Array.isArray(service.modules.js)) {
      // For the remote data, concatenate the frontend url to the relative file url, for the local data use the backend url
      remote = remote.concat(service.modules.js.map((url) => {return service.frontend_url + url;}));
      local = local.concat(service.modules.js.map((url) => {return service.backend_url + url;}));
    }
    if(service.modules && service.modules.pages && service.modules.pages != [] && Array.isArray(service.modules.pages)) {
      service.modules.pages.forEach((page) => {
        if(page.module_link) {
          remote.push(service.frontend_url + page.module_link);
          local.push(service.backend_url + page.module_link);
        }
      });
    }
  });

  return {
    remote: remote,
    local: local
  };
}
exports.js = js;

const css = function(services) {
  var remote = []; // For including directly in the browser
  var local = []; // For downloading through gulp and merging into one file
  services.forEach((service) => {
    if(service.modules && service.modules.css && service.modules.css != [] && Array.isArray(service.modules.css)) {
      // For the remote data, concatenate the frontend url to the relative file url, for the local data use the backend url
      remote = remote.concat(service.modules.css.map((url) => {return service.frontend_url + url;}));
      local = local.concat(service.modules.css.map((url) => {return service.backend_url + url;}));
    }
  });

  return {
    remote: remote,
    local: local
  };
}
exports.css = css;

const deps = function(services) {
  return require('./parseDependencies.js')(services);
}
exports.deps = deps;

const template = function(services) {
  return require('./parseTemplate.js')(services, css(services), js(services), deps(services));
}
exports.template = template;
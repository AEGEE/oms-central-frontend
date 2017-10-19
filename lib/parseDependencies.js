/* Dependencies are listed in the getModules.json of each ms, and additionally there are some global dependencies that will be fetched even with no microservice in place.
a dependency file looks like:

deps: [
{
  npm: "angular-ui-router"
  js: ["node_modules/path_to_dependency.js"]
  css: ["node_modules/path_to_dependency.css"]
  module: "ui-router"
}]

*/

const static = require('./static.json');
const config = require('./config.json');

module.exports = function(services) {
  var tmp = static.dependencies;

  // parse dependencies from services
  services.forEach((service) => {
    if(service.modules && service.modules.deps && service.modules.deps != [] && Array.isArray(service.modules.deps)) {
      tmp = tmp.concat(service.modules.deps);
    }
  });

  // remove duplicates
  tmp = tmp.filter(function(item, pos) {
    return tmp.indexOf(item) == pos;
  })

  // join into one result object
  var retval = {
    npm: [],
    js: [],
    css: [],
    assets: [],
    module: [],
  }
  tmp.forEach((dep) => {
    if(dep.npm && typeof(dep.npm) == "string")
      retval.npm.push(dep.npm);
    if(dep.js && dep.js != [] && Array.isArray(dep.js)) 
      retval.js = retval.js.concat(dep.js);
    if(dep.js && (typeof dep.js) == "string")
      retval.js.push(dep.js);
    if(dep.css && dep.css != [] && Array.isArray(dep.css))
      retval.css = retval.css.concat(dep.css);
    if(dep.css && (typeof dep.css) == "string")
      retval.css.push(dep.css);
    if(dep.assets && dep.assets != [] && Array.isArray(dep.assets))
      retval.assets = retval.assets.concat(dep.assets);
    if(dep.assets && (typeof dep.assets) == "string")
      retval.assets.push(dep.assets);
    if(dep.module && (typeof dep.module) == "string")
      retval.module.push(dep.module);
  });

  // add build path prefixes
  retval.js = retval.js.map((item) => {
    return config.build_folder + '/' + item;
  });  
  retval.css = retval.css.map((item) => {
    return config.build_folder + '/' + item;
  });
  retval.assets = retval.assets.map((item) => {
    return config.build_folder + '/' + item;
  });

  return retval;
}
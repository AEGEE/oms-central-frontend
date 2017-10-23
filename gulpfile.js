const gulp = require('gulp');
const gulpHandlebars = require('gulp-compile-handlebars');
const gulpMerge = require('gulp-merge');
const gulpDownload = require('gulp-download-stream');
const gulpConcatCSS = require('gulp-concat-css');
const gulpConcatJS = require('gulp-concat-js');
const gulpSourcemaps = require('gulp-sourcemaps');
const gulpConcat = require('gulp-concat');
const gulpCleanCSS = require('gulp-clean-css');
const gulpStripCSSComments = require('gulp-strip-css-comments');
const gulpCleanJS = require('gulp-minify');
const gulpUglify = require('gulp-uglify');
const gulpEmpty = require('gulp-empty');
const gulpDebug = require('gulp-debug');
const gulpClean = require('gulp-clean');
const cmd = require('node-cmd');

const parse = require('./lib/parse.js');
const config = require('./lib/config.json');
const queryServices = require('./lib/queryServices.js');

// Save services in RAM
var services = [];

gulp.task('fetch', function(done) {
  queryServices((res) => {
    services = res;
    done();
  });
});

gulp.task('html', function(){
  const templateData = parse.template(services);
  return gulp.src('templates/**/*')
    .pipe(gulpDebug({title: 'HTML'}))
    .pipe(gulpHandlebars(templateData))
    .pipe(gulp.dest(config.dist_folder));
});

gulp.task('download', function() {
  const cssData = parse.css(services);
  const jsData = parse.js(services);
  return gulpDownload(cssData.local.concat(jsData.local))
    .pipe(gulp.dest(config.download_folder));
})

gulp.task('css', function(){
  const cssData = parse.css(services);
  // Merge whatever is in the css folder and what services want to include
  // Do not add the service includes in dev mode as then it will be included directly by url
  if(!config.devMode) {
    return gulp.src(['assets/css/**/*.css', config.download_folder + '/**/*.css'])
      .pipe(gulpDebug({title: 'CSS'}))
      .pipe(gulpCleanCSS())
      .pipe(gulpConcat('assets/main.css'))
      .pipe(gulp.dest(config.dist_folder));
  }
  else {
    return gulp.src('assets/css/**/*.css')
      .pipe(gulpDebug({title: 'CSS'}))
      .pipe(gulpSourcemaps.init())
      .pipe(gulpConcat('assets/main.css'))
      .pipe(gulpSourcemaps.write())
      .pipe(gulp.dest(config.dist_folder));
  }
});

gulp.task('js', function(){
  const jsData = parse.js(services);
  // Merge whatever is in the css folder and what services want to include
  // Do not add the service includes in dev mode as then it will be included directly by url
  if(!config.devMode) {
    return gulp.src(['assets/js/**/*.js', config.download_folder + '/**/*.js'])
      .pipe(gulpDebug({title: 'JS'}))
      .pipe(gulpCleanJS())
      .pipe(gulpConcat('assets/main.js'))
      .pipe(gulp.dest(config.dist_folder));  
  }
  else {
    return gulp.src('assets/js/**/*.js')
      .pipe(gulpDebug({title: 'JS'}))
      .pipe(gulpSourcemaps.init())
      .pipe(gulpConcat('assets/main.js'))
      .pipe(gulpSourcemaps.write())
      .pipe(gulp.dest(config.dist_folder));
  }
});

gulp.task('static', function() {
  return gulp.src('assets/static/**/*')
    .pipe(gulp.dest(config.dist_folder));
})

// Execute npm install to fetch frontend dependencies
gulp.task('vendor-install', (callback) => {
  const deps = parse.deps(services);
  const modules = deps.npm.join(' ');
  var command = `
    mkdir -p ${config.build_folder}
    cd ${config.build_folder}
    npm init --yes > /dev/null
    npm install --save ${modules}
  `;
  console.log("Executing: ", command);
  const processRef = cmd.get(command, (err, stdout, stderr) => {
    if(err) {
      console.log("The npm command failed", err);
      return callback(err);
    }
    else {
      return callback();
    }
  });

  let data_line = '';
   
  //listen to the terminal output 
  processRef.stdout.on('data', function(data) {
    data_line += data;
    if (data_line[data_line.length-1] == '\n') {
      console.log(data_line);
    }
  });
});

gulp.task('vendor-assets', function(done) {
  const deps = parse.deps(services);
  if(!deps.assets.length)
    return done();

  return gulp.src(deps.assets)
    .pipe(gulpDebug({title: 'Vendor assets'}))
    .pipe(gulp.dest(config.dist_folder + '/assets/vendor'))
})

gulp.task('vendor-css', function(done) {
  const deps = parse.deps(services);
  deps.css.unshift('assets/vendor-css/**/*.css');

  return gulp.src(deps.css)
    .pipe(gulpDebug({title: 'Vendor CSS'}))
//    .pipe(gulpCleanCSS())
    .pipe(gulpStripCSSComments())
    .pipe(gulpConcat('assets/vendor.css'))
    .pipe(gulp.dest(config.dist_folder));
});

gulp.task('vendor-js', function(done) {
  const deps = parse.deps(services);
  deps.js.unshift('assets/vendor-js/**/*.js');

  return gulp.src(deps.js)
    .pipe(gulpDebug({title: 'Vendor JS'}))
    .pipe(gulpUglify()) // uglify turned out better than clean-js, though making the sourcecode unreadable
    .pipe(gulpConcat('assets/vendor.js'))
    .pipe(gulp.dest(config.dist_folder));
});


gulp.task('vendor', gulp.series('vendor-install', 'vendor-assets', 'vendor-css', 'vendor-js'))

gulp.task('clean', function (done) {
  cmd.get(`
    cd ${config.dist_folder} && rm -rf *
    cd ${config.build_folder} && rm -rf *
    cd ${config.download_folder} && rm -rf *
    `, (err, stdout, stderr) => {
      done()
    });
});

gulp.task('offline', gulp.series('fetch', 'download', 'css', 'js', 'static', 'html'));

gulp.task('default', gulp.series(
  'fetch',
  'download',
//  gulp.parallel('vendor', 'css', 'js', 'static'),
  'vendor', 'css', 'js', 'static',
  'html'));

gulp.task('every', () => {
  setInterval(gulp.series('default'), config.gulp_interval);
})
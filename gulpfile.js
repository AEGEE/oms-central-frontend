const gulp = require('gulp');
const gulpHandlebars = require('gulp-compile-handlebars');
const gulpMerge = require('gulp-merge');
const gulpDownload = require('gulp-download');
const gulpConcatCSS = require('gulp-concat-css');
const gulpConcatJS = require('gulp-concat-js');
const gulpSourcemaps = require('gulp-sourcemaps');
const gulpConcat = require('gulp-concat');
const gulpCleanCSS = require('gulp-clean-css');
const gulpCleanJS = require('gulp-minify');
const gulpEmpty = require('gulp-empty');
const gulpDebug = require('gulp-debug');
const gulpClean = require('gulp-clean');

const fetchTemplate = require('./lib/fetchTemplateData.js');
const fetchCSS = require('./lib/fetchCSS.js');
const fetchJS = require('./lib/fetchJS.js');
const config = require('./lib/config.json');

function merge(local, remote) {
  if(local.length && !remote.length)
    return gulp.src(local);
  else if(!local.length && remote.length)
    return gulpDownload(remote);
  else if(local.length && remote.length)
    return gulpMerge(gulp.src(local), gulpDownload(remote));
  else
    throw "No files that can be build"
}

gulp.task('html', function(done){
  fetchTemplate((templateData) => {
    gulp.src('templates/**/*')
      .pipe(gulpDebug({title: 'HTML'}))
      .pipe(gulpHandlebars(templateData))
      .pipe(gulp.dest(config.dist_folder));
    done();
  });
});

gulp.task('css', function(done){
  fetchCSS((cssData) => {
    merge('assets/css/**/*.css', cssData.remote)
      .pipe(gulpDebug({title: 'CSS'}))
      .pipe(gulpSourcemaps.init())
      .pipe(gulpCleanCSS())
      .pipe(gulpConcat('assets/main.css'))
      .pipe(gulpSourcemaps.write())
      .pipe(gulp.dest(config.dist_folder));
    done();
  })
});

gulp.task('js', function(done){
  fetchJS((jsData) => {
    download = () => {
      if(jsData.remote)
        return gulpDownload(jsData.remote);
      else
        return gulpEmpty();
    }

    merge('assets/js/**/*.js', jsData.remote)
      .pipe(gulpDebug({title: 'JS'}))
      .pipe(gulpSourcemaps.init())
      //.pipe(gulpCleanJS())
      .pipe(gulpConcat('main.js'))
      .pipe(gulpSourcemaps.write())
      .pipe(gulp.dest(config.dist_folder));
    done();
  });
});

gulp.task('static', function() {
  return gulp.src('assets/static/**/*')
    .pipe(gulp.dest(config.dist_folder));
})


gulp.task('clean', function () {
  return gulp.src(config.dist_folder + '/*', {read: false})
    .pipe(gulpClean());
});

gulp.task('default', gulp.parallel('html', 'css', 'js', 'static'));

gulp.task('every', () => {
  setInterval(gulp.parallel('default'), config.gulp_interval);
})
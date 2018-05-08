const gulp = require('gulp');
const zip = require('gulp-zip');
const unzip = require('gulp-unzip');
const mocha = require('gulp-mocha');
const gulpSequence = require('gulp-sequence');
const eslint = require('gulp-eslint');
const fs = require('fs');
const exec = require('child_process').exec;
const serverlessGulp = require('serverless-gulp');
const commandLineArgs = require('command-line-args');
const del = require('del');
const optionDefinitions = [ { name: 'env', alias: 'e', type: String } ];
const cmdoptions = commandLineArgs(optionDefinitions);

const riddlerdevelopmentskillconfig = {
  riddler_env_name: 'dev',
  alexa_app_name: 'riddler',
  bucket_name: 'riddler-dev',
  secret_key_id: process.env.RIDDLER_SECRET_ACCESS_KEY,
  access_key_id: process.env.RIDDLER_ACCESS_KEY_ID
};

const riddleritskillconfig = {
  riddler_env_name: 'it',
  alexa_app_name: 'riddler',
  table_name: 'ayu-it',
  bucket_name: 'alexa-riddler-it',
  lambda_function_name: 'alexa-riddler-it',
  description: 'riddler skill IT environment',
  secret_key_id: process.env.RIDDLER_SECRET_ACCESS_KEY,
  access_key_id: process.env.RIDDLER_ACCESS_KEY_ID
};

let skillconfig;

switch (cmdoptions.env) {
  case 'dev':
  skillconfig = riddlerdevelopmentskillconfig;
  break;

  case 'it':
  skillconfig = riddleritskillconfig;
  break;

  default:
  skillconfig = riddlerdevelopmentskillconfig;
}

let paths = {
  javascript: [ 'index.js' ],
  config: 'riddlerskillconfig.json',
  serverless: [ 'serverless.yml' ]
};

// generate alexa skill configuration
gulp.task('default', (cb) => {
  if (!('env' in cmdoptions)) {
    console.error('❌ Provide a token (-e) with environment name.');
    process.exit();
  } else {
    gulpSequence([ 'createconfig' ], cb);
  }
});

// generate es lint report, configured in .eslintrc.json
gulp.task('lint', () => {
  return gulp.src(paths.javascript)
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
});

// sequence: package a single archive suitable for deployment to aws lambda
// see serverless.yml for configuration of packaging
gulp.task('deploy', (cb) => {
  if (!('env' in cmdoptions)) {
    console.error('❌  Provide a token (-e) with environment name. Example "gulp deploy -e it"');
    process.exit();
  } else {
    return gulpSequence('createconfig', 'modclean', 'serverlessDeploy', cb);
  }
});

gulp.task('createconfig', (cb) => {
  if (!('env' in cmdoptions)) {
    console.error('❌  Provide a token (-e) with environment name. Example "gulp createconfig -e it"');
    process.exit();
  } else {
    console.log('creating riddlerSkillConfig.json file.');
    return fs.writeFile(paths.config, JSON.stringify(skillconfig), cb);
  }
});

// remove unnecessary files from our node_modules to save disk space
gulp.task('modclean', (cb) => {
  return exec('./node_modules/.bin/modclean -r --no-progress', (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

// https://www.npmjs.com/package/serverless-plugin-optimize
gulp.task('serverlessDeploy', () => {
  return gulp.src(paths.serverless, { read: false })
  .pipe(serverlessGulp.exec('deploy', { stage: cmdoptions.env}));
});

gulp.task('dist', (cb) => {
  if (!('env' in cmdoptions)) {
    console.error('❌  Provide a token (-e) with environment name. Example "gulp deploy -e it"');
    process.exit();
  } else {
    return gulpSequence('createconfig', 'modclean', 'delete-dist', 'package', 'unzip-optimized', 'zip-optimized', 'clean', 'remove', cb);
  }
});


// generate an optimized, single file version of our alexa skill js codebase
// https://www.npmjs.com/package/serverless-plugin-optimize
gulp.task('package', () => {
  return gulp.src(paths.serverless, {
    'read': false
  })
  .pipe(serverlessGulp.exec('package', {
    'package': 'tmp-pkg'
  }));
});

// extract js file in a subdirectory, intended for a new zip archive at the top level
gulp.task('unzip-optimized', () => {
  return gulp.src('./tmp-pkg/riddler-alexa.zip')
  .pipe(unzip())
  .pipe(gulp.dest('./tmp-ozip'));
});

// delete previous build
gulp.task('delete-dist', () => {
  return del([ `dist/${skillconfig.riddler_env_name}_skill_lambda.zip` ]);
});

// zip an optimized js file at the top level of the archive
gulp.task('zip-optimized', () => {
  return gulp.src(`tmp-ozip/_optimize/${skillconfig.bucket_name}/index.js`)
  .pipe(zip(`${skillconfig.riddler_env_name}_skill_lambda.zip`))
  .pipe(gulp.dest('dist'));
});

// delete tmp folder after zip and unzip
gulp.task('clean', () => {
  return del([ 'tmp-ozip/**', 'tmp-pkg/**' ]);
});

// Remove the existing s3 files, cloudformation stack and lambda function
gulp.task('remove', () => {
  if (!('env' in cmdoptions)) {
    console.error('❌  Provide a token (-e) with environment name. Example "gulp remove -e it"');
    process.exit();
  } else {
    gulp.src(paths.serverless, { read: false })
    .pipe(serverlessGulp.exec('remove', { stage: cmdoptions.env }));
  }
});

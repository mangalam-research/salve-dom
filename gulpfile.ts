// tslint:disable: missing-jsdoc
import { ArgumentParser } from "argparse";
import * as Promise from "bluebird";
import * as del from "del";
import * as es from "event-stream";
import * as originalGulp from "gulp";
import * as help from "gulp-help";
import * as gulpNewer from "gulp-newer";
import * as sourcemaps from "gulp-sourcemaps";
import * as ts from "gulp-typescript";
import * as gutil from "gulp-util";
import * as path from "path";
import * as versync from "versync";
import * as webpack from "webpack";
import { cprp, exec, execFile, existsInFile, fs, mkdirpAsync, newer,
         spawn } from "./gulptasks/util";
import * as webpackConfig from "./webpack.config";

const gulp = help(originalGulp);

const parser = new ArgumentParser({ addHelp: true });

parser.addArgument(["--browsers"], {
  help: "Set which browsers to use.",
  nargs: "+",
});

parser.addArgument(["--saxon"], {
  help: "Sets the saxon process to use.",
  defaultValue: "saxon",
});

// We have this here so that the help message is more useful than without. At
// the same time, this positional argument is not *required*.
parser.addArgument(["target"], {
  help: "Target to execute.",
  nargs: "?",
  defaultValue: "default",
});

const globalOptions = parser.parseArgs(process.argv.slice(2));

const project = ts.createProject("src/tsconfig.json");
gulp.task("tsc", "Typescript compilation", () => {
  // The .once nonsense is to work around a gulp-typescript bug
  //
  // See: https://github.com/ivogabe/gulp-typescript/issues/295
  //
  // For the fix see:
  // https://github.com/ivogabe/gulp-typescript/issues/295#issuecomment-197299175
  //
  const result = project.src()
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(project())
    .once("error", function onError(this: any): void {
      // tslint:disable-next-line: no-invalid-this
      this.once("finish", () => {
        process.exit(1);
      });
    });

  const dest = "build/dist/lib";
  return es.merge(result.js
                  .pipe(sourcemaps.write("."))
                  .pipe(gulp.dest(dest)),
                  result.dts.pipe(gulp.dest(dest)));
});

gulp.task("copy", () => {
  const dest = "build/dist/";
  return gulp.src(
    [
      "package.json",
    ],
    { base: "." })
    .pipe(gulpNewer(dest))
    .pipe(gulp.dest(dest));
});

gulp.task(
  "convert-test-files",
  "Convert the test files to what is needed by Mocha.",
  (callback) => {
    const promises: Promise<any>[] = [];
    gulp.src("test/data/**", { base: "test/data", read: false, nodir: true })
      .on("data", (file: any) => {
        const p = Promise.coroutine(function *dataPromise(): any {
          const ext = path.extname(file.relative);
          const destName = path.join(
            "build/test-files",
            file.relative.substring(0, file.relative.length - ext.length));
          const dest = `${destName}_converted.xml`;

          const tei = yield existsInFile(file.path,
                                         /http:\/\/www.tei-c.org\/ns\/1.0/);

          let isNewer;
          let xsl;
          if (tei) {
            xsl = "test/xml-to-xml-tei.xsl";
            isNewer = yield newer([file.path, xsl], dest);
          }
          else {
            isNewer = yield newer(file.path, dest);
          }

          if (!isNewer) {
            return;
          }

          if (tei) {
            yield exec(`${globalOptions.saxon} -s:${file.path} -o:${dest} -xsl:${xsl}`);
          }
          else {
            yield mkdirpAsync(path.dirname(dest));
            yield cprp(file.path, dest);
          }
        })();
        promises.push(p);
      })
      .on("end", () => {
        Promise.all(promises).asCallback(callback);
      });
  });

gulp.task(
  "webpack", "Produce the distribution bundles.", ["default"],
  (callback) => {
    webpack(webpackConfig as any, (err, stats) => {
      if (err) {
        callback!(new gutil.PluginError("webpack", err));
        return;
      }

      const errors = stats.toJson().errors;
      if (errors.length) {
        callback!(new gutil.PluginError("webpack", errors.join("")));
        return;
      }

      gutil.log("[webpack]", stats.toString({ colors: true }));
      callback!();
    });
  });

//
// Spawning a process due to this:
//
// https://github.com/TypeStrong/ts-node/issues/286
//
function runKarma(options: string[]): Promise<any> {
  // We cannot let it be set to ``null`` or ``undefined``.
  if (globalOptions.browsers) {
    options = options.concat("--browsers", globalOptions.browsers);
  }
  return spawn("./node_modules/.bin/karma", options, { stdio: "inherit" });
 }

gulp.task("karma", "Run the karma tests.", ["default", "convert-test-files"],
          () => runKarma(["start", "--single-run"]));

gulp.task(
  "karma-webpack", "Run the karma test that tests the webpack bundle.",
  ["webpack", "convert-test-files"],
  () => {
    // We override whatever was passed in --browsers.
    globalOptions.browsers = ["Chrome"];
    return runKarma(["start", "karma-webpack.conf.js", "--single-run"]);
  });

gulp.task("versync", "Run a version check on the code.",
          () => versync.run({
            verify: true,
            onMessage: gutil.log,
          }));

//
// There are problems trying to run gulp-tslint with a project file, which is
// needed by --type-check. See:
//
// https://github.com/panuhorsmalahti/gulp-tslint/issues/77
// https://github.com/panuhorsmalahti/gulp-tslint/issues/105
//
gulp.task("tslint", "Lint.", () =>
          spawn("./node_modules/.bin/tslint",
                ["--type-check", "*.ts", "{src,test,gulptasks}/**/*.ts"],
                { stdio: "inherit" }));

gulp.task("test", "Run the tests.", ["default", "tslint", "versync", "karma"]);

gulp.task("default", ["tsc", "copy"]);

let packname: string;
gulp.task("pack", "Make an npm.", ["webpack"],
          () => execFile("npm", ["pack", "dist"], { cwd: "build" })
          .then(([_packname]) => {
            packname = _packname.trim();
          }));

gulp.task("install-test", ["pack"], Promise.coroutine(function *install(): any {
  const testDir = "build/install_dir";
  yield del(testDir);
  yield fs.mkdirAsync(testDir);
  yield fs.mkdirAsync(path.join(testDir, "node_modules"));
  yield execFile("npm", ["install", `../${packname}`], { cwd: testDir });
  yield del(testDir);
}) as any);

gulp.task("publish", "Publish the package.", ["install-test"],
          () => execFile("npm", ["publish", packname], { cwd: "build" }));

gulp.task("clean", "Remove the build.", () => del(["build"]));

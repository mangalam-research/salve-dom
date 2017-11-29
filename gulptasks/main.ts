// tslint:disable: missing-jsdoc
import { ArgumentParser } from "argparse";
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

import * as webpackConfig from "../webpack.config";
import { cprp, exec, execFile, existsInFile, fs, mkdirpAsync, newer,
         spawn, touchAsync } from "./util";

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
  // tslint:disable-next-line:max-line-length
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
    const promises: Promise<void>[] = [];
    gulp.src("test/data/**", { base: "test/data", read: false, nodir: true })
      .on("data", (file: any) => {
        const p = (async () => {
          const ext = path.extname(file.relative);
          const destName = path.join(
            "build/test-files",
            file.relative.substring(0, file.relative.length - ext.length));
          const dest = `${destName}_converted.xml`;

          const tei = await existsInFile(file.path,
                                         /http:\/\/www.tei-c.org\/ns\/1.0/);

          let isNewer;
          let xsl;
          if (tei) {
            xsl = "test/xml-to-xml-tei.xsl";
            isNewer = await newer([file.path, xsl], dest);
          }
          else {
            isNewer = await newer(file.path, dest);
          }

          if (!isNewer) {
            return;
          }

          if (tei) {
            await exec(
              `${globalOptions.saxon} -s:${file.path} -o:${dest} -xsl:${xsl}`);
          }
          else {
            await mkdirpAsync(path.dirname(dest));
            await cprp(file.path, dest);
          }
        })();
        promises.push(p);
      })
      .on("end", () => {
        // tslint:disable-next-line:no-floating-promises
        Promise.all(promises).then(() => {
          // tslint:disable-next-line:no-non-null-assertion
          callback!();
        }, callback);
      });
  });

gulp.task(
  "webpack", "Produce the distribution bundles.", ["default"],
  (_callback) => {
    // tslint:disable-next-line:no-non-null-assertion
    const callback = _callback!;
    webpack(webpackConfig as any, (err, stats) => {
      if (err) {
        callback(new gutil.PluginError("webpack", err));
        return;
      }

      const errors = stats.toJson().errors;
      if (errors.length) {
        callback(new gutil.PluginError("webpack", errors.join("")));
        return;
      }

      gutil.log("[webpack]", stats.toString({ colors: true }));
      callback();
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

function runTslint(tsconfig: string, tslintConfig: string): Promise<void> {
  return spawn("./node_modules/.bin/tslint",
               ["--type-check", "--format", "verbose", "--project",
                tsconfig, "-c", tslintConfig],
               { stdio: "inherit" });
}

gulp.task("tslint-src", "Lint src.", () => runTslint("src/tsconfig.json",
                                                     "tslint.json"));

gulp.task("tslint-tests", "Lint tests files.",
          () => runTslint("test/tsconfig.json", "test/tslint.json"));

gulp.task("tslint-aux", "Lint auxiliary files.",
          () => runTslint("tsconfig.json", "gulptasks/tslint.json"));

gulp.task("tslint", "Lint all the typescript files.", ["tslint-src",
                                                       "tslint-tests",
                                                       "tslint-aux"]);

gulp.task("test", "Run the tests.", ["default", "tslint", "versync", "karma"]);

gulp.task("default", ["tsc", "copy"]);

let packname: string;
gulp.task("pack", "Make an npm.", ["webpack"],
          () => execFile("npm", ["pack", "dist"], { cwd: "build" })
          .then(([_packname]) => {
            packname = _packname.trim();
          }));

gulp.task("install-test", ["pack"], async () => {
  const testDir = "build/install_dir";
  await del(testDir);
  await fs.mkdirAsync(testDir);
  await fs.mkdirAsync(path.join(testDir, "node_modules"));
  await execFile("npm", ["install", `../${packname}`], { cwd: testDir });
  await del(testDir);
});

gulp.task("publish", "Publish the package.", ["install-test"],
          () => execFile("npm", ["publish", packname], { cwd: "build" }));

// This task also needs to check the hash of the latest commit because typedoc
// generates links to source based on the latest commit in effect when it is
// run. So if a commit happened between the time the doc was generated last, and
// now, we need to regenerate the docs.
gulp.task("typedoc", "Generate the documentation", ["tslint"], async () => {
  const sources = ["src/**/*.ts"];
  const stamp = "build/api.stamp";
  const hashPath = "./build/typedoc.hash.txt";

  const [savedHash, [currentHash]] = await Promise.all(
    [fs.readFileAsync(hashPath).then(hash => hash.toString())
     .catch(() => undefined),
     execFile("git", ["rev-parse", "--short", "HEAD"], {})
     .then(({ stdout }) => stdout),
    ]);

  if ((currentHash === savedHash) && !(await newer(sources, stamp))) {
    gutil.log("No change, skipping typedoc.");
    return;
  }

  const tsoptions = [
    "--out", "./build/api", "--name", "salve-dom",
    "--tsconfig", "./src/tsconfig.json", "--listInvalidSymbolLinks",
  ];

  if (!globalOptions.doc_private) {
    tsoptions.push("--excludePrivate");
  }

  await spawn("./node_modules/.bin/typedoc", tsoptions, { stdio: "inherit" });

  await Promise.all([fs.writeFileAsync(hashPath, currentHash),
                     touchAsync(stamp)]);
});

gulp.task("clean", "Remove the build.", () => del(["build"]));

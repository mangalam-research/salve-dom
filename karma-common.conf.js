// Minimal localConfig if there is not one locally.
"use strict";
let _ = require("lodash");

let localConfig = {
  browserStack: {},
};
try {
  // eslint-disable-next-line import/no-unresolved, global-require
  localConfig = require("./local-config");
}
catch (ex) {} // eslint-disable-line no-empty

module.exports = function(config) {
  const options = {
    basePath: ".",
    frameworks: ["mocha", "chai"],
    client: {
      mocha: {
        grep: config.grep,
      },
    },
    reportSlowerThan: 200,
    files: [
      "https://cdn.jsdelivr.net/bluebird/3.4.3/bluebird.min.js",
      "polyfills/firstElementChild_etc.js",
      "node_modules/systemjs/dist/system.js",
      "test/karma-main.js",
      { pattern: "build/dist/**/*.@(js|json|map)", included: false },
      { pattern: "build/test-files/**/*", included: false },
      { pattern: "test/**/*.ts", included: false },
      { pattern: "test/schemas/*.js", included: false },
      { pattern: "node_modules/salve/@(*.js|package.json)", included: false },
      { pattern: "node_modules/systemjs-plugin-text/@(*.js|package.json)",
        included: false },
    ],
    exclude: [],
    preprocessors: {
      "test/**/*.ts": ["typescript"],
    },
    typescriptPreprocessor: {
      tsconfigPath: "./test/tsconfig.json",
      compilerOptions: {
        // eslint-disable-next-line global-require
        typescript: require("typescript"),
        sourceMap: false,
        // We have to have them inline for the browser to find them.
        inlineSourceMap: true,
        inlineSources: true,
      },
    },
    reporters: ["progress"],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browserStack: {
      project: "salve-dom",
    },
    browsers: ["ChromeHeadless", "FirefoxHeadless"],
    customLaunchers: {
      ChromeWin: {
        base: "BrowserStack",
        browser: "Chrome",
        os: "Windows",
        os_version: "10",
      },
      FirefoxWin: {
        base: "BrowserStack",
        browser: "Firefox",
        os: "Windows",
        os_version: "10",
      },
      IE11: {
        base: "BrowserStack",
        browser: "IE",
        browser_version: "11",
        os: "Windows",
        os_version: "8.1",
      },
      Edge: {
        base: "BrowserStack",
        browser: "Edge",
        os: "Windows",
        os_version: "10",
      },
      Opera: {
        base: "BrowserStack",
        browser: "Opera",
        os: "Windows",
        os_version: "10",
      },
      SafariElCapitan: {
        base: "BrowserStack",
        browser: "Safari",
        os: "OS X",
        os_version: "El Capitan",
      },
      SafariYosemite: {
        base: "BrowserStack",
        browser: "Safari",
        os: "OS X",
        os_version: "Yosemite",
      },
      SafariMavericks: {
        base: "BrowserStack",
        browser: "Safari",
        os: "OS X",
        os_version: "Mavericks",
      },
    },
    singleRun: false,
  };

  // Bring in the options from the localConfig file.
  _.merge(options.browserStack, localConfig.browserStack);

  const browsers = config.browsers;
  if (browsers.length === 1 && browsers[0] === "all") {
    const newList = options.browsers.concat(Object.keys(options.customLaunchers));

    // Yes, we must modify this array in place.
    browsers.splice.apply(browsers, [0, browsers.length].concat(newList));
  }

  return options;
};

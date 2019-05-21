"use strict";

module.exports = (config) => {
  const options = {
    basePath: ".",
    frameworks: ["mocha", "chai", "source-map-support"],
    client: {
      mocha: {
        grep: config.grep,
      },
    },
    reportSlowerThan: 200,
    files: [
      "node_modules/systemjs/dist/system.js",
      "test/karma-main.js",
      { pattern: "build/dist/**/*.@(js|json|map)", included: false },
      { pattern: "build/test-files/**/*", included: false },
      { pattern: "test/**/*.ts", included: false },
      { pattern: "test/schemas/*.js", included: false },
      {
        pattern: "node_modules/salve/@(*.js|*.map|package.json)",
        included: false,
      },
      {
        pattern: "node_modules/systemjs-plugin-text/@(*.js|package.json)",
        included: false,
      },
    ],
    exclude: [],
    preprocessors: {
      "test/**/*.ts": ["typescript"],
    },
    typescriptPreprocessor: {
      tsconfigPath: "./test/tsconfig.json",
      compilerOptions: {
        // eslint-disable-next-line global-require, import/no-extraneous-dependencies
        typescript: require("typescript"),
        sourceMap: false,
        // We have to have them inline for the browser to find them.
        inlineSourceMap: true,
        inlineSources: true,
      },
    },
    reporters: ["mocha"],
    mochaReporter: {
      showDiff: true,
    },
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
      SafariHighSierra: {
        base: "BrowserStack",
        browser: "Safari",
        os: "OS X",
        os_version: "High Sierra",
      },
      SafariSierra: {
        base: "BrowserStack",
        browser: "Safari",
        os: "OS X",
        os_version: "Sierra",
      },
    },
    singleRun: false,
  };

  let localConfig = {
    browserStack: {},
  };

  if (process.env.CONTINUOUS_INTEGRATION) {
    // Running on Travis. The user id and key are taken from the environment.
    localConfig.browserStack.startTunnel = true;
  }
  else {
    // Running outside Travis: we get our configuration from ./local-config, if
    // it exists.
    try {
      // eslint-disable-next-line import/no-unresolved, global-require
      localConfig = require("./local-config");
    }
    catch (ex) {} // eslint-disable-line no-empty
  }

  // Merge the browserStack configuration we got with the base values in our
  // config.
  Object.assign(options.browserStack, localConfig.browserStack);

  const { browsers } = config;
  if (browsers.length === 1 && browsers[0] === "all") {
    const newList = options.browsers.concat(Object.keys(options.customLaunchers));

    // Yes, we must modify this array in place.
    // eslint-disable-next-line prefer-spread
    browsers.splice.apply(browsers, [0, browsers.length].concat(newList));
  }

  return options;
};

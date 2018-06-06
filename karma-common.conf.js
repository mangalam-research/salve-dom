"use strict";
let _ = require("lodash");

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
      "node_modules/core-js/client/core.js",
      "node_modules/whatwg-fetch/fetch.js",
      "https://cdn.jsdelivr.net/bluebird/3.4.3/bluebird.min.js",
      "polyfills/firstElementChild_etc.js",
      "node_modules/systemjs/dist/system.js",
      "test/karma-main.js",
      { pattern: "build/dist/**/*.@(js|json|map)", included: false },
      { pattern: "build/test-files/**/*", included: false },
      { pattern: "test/**/*.ts", included: false },
      { pattern: "test/schemas/*.js", included: false },
      { pattern: "node_modules/salve/@(*.js|*.map|package.json)", included: false },
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

  let localConfig = {
    browserStack: {},
  };

  if (process.env.CONTINUOUS_INTEGRATION) {
    // Running on Travis. Grab the configuration from Travis.
    localConfig.browserStack = {
      // Travis provides the tunnel.
      startTunnel: false,
      tunnelIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
      // Travis adds "-travis" to the name, which mucks things up.
      username: process.env.BROWSERSTACK_USER.replace("-travis", ""),
      accessKey: process.env.BROWSERSTACK_ACCESS_KEY,
    };
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
  _.merge(options.browserStack, localConfig.browserStack);

  const browsers = config.browsers;
  if (browsers.length === 1 && browsers[0] === "all") {
    const newList = options.browsers.concat(Object.keys(options.customLaunchers));

    // Yes, we must modify this array in place.
    browsers.splice.apply(browsers, [0, browsers.length].concat(newList));
  }

  return options;
};

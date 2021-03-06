/* global SystemJS */

"use strict";

(function main() {
  const webpackTest = window.__WEBPACK_TEST_ENV;

  // Cancel the autorun. This essentially does the magic that the RequireJS
  // adapter (and maybe the SystemJS adapter too) do behind the scenes. We call
  // window.__karma__.start later.
  window.__karma__.loaded = function loaded() {};

  const allTestFiles = [];
  let TEST_REGEXP;
  let baseURL;
  if (webpackTest) {
    baseURL = "/base/build/dist";
    TEST_REGEXP = /test\/webpack_test\.js$/;
  }
  else {
    baseURL = "/base/build";
    TEST_REGEXP = /test\/(?!karma-main|webpack).*_test\.js$/i;
  }

  Object.keys(window.__karma__.files).forEach((file) => {
    if (TEST_REGEXP.test(file)) {
      const normalizedTestModule = file.replace(/\.js$/g, "");
      allTestFiles.push(normalizedTestModule);
    }
  });

  SystemJS.config({
    baseURL,
    paths: {
      "npm:": "/base/node_modules/",
      "build/test-files/": "/base/build/test-files/",
    },
    map: {
      salve: "npm:salve/salve.min",
      text: "npm:systemjs-plugin-text",
      "test/schemas": "/base/test/schemas",
      "salve-dom": "salve-dom.min",
    },
    packages: {
      "": {
        defaultExtension: "js",
      },
    },
    packageConfigPaths: [
      "/base/build/dist/package.json",
      "npm:*/package.json",
    ],
  });

  // These are preloaded by Karma as scripts that leak into the global space.
  SystemJS.amdDefine("mocha.js", [], {});
  SystemJS.amdDefine("chai.js", [], {});

  function importIt(file) {
    return SystemJS.import(file);
  }

  Promise.all(allTestFiles.map(importIt))
    .then(window.__karma__.start);
}());

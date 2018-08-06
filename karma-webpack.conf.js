// Minimal localConfig if there is not one locally.

"use strict";

const common = require("./karma-common.conf");

module.exports = (config) => {
  const options = common(config);
  options.files = [
      "test/karma-webpack-env.js",
  ].concat(options.files);
  config.set(options);
};

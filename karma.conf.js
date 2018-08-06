// Minimal localConfig if there is not one locally.

"use strict";

const common = require("./karma-common.conf");

module.exports = (config) => {
  config.set(common(config));
};

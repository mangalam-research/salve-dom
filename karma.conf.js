// Minimal localConfig if there is not one locally.
"use strict";

const common = require("./karma-common.conf");

module.exports = function(config) {
  config.set(common(config));
};

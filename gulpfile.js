"use strict";

require("ts-node").register({
  transpileOnly: true,
  cache: true,
  cacheDirectory: ".tscache",
});

require("./gulptasks/main");

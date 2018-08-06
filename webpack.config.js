"use strict";

const externals = {};
["salve"].forEach((name) => {
  externals[name] = name;
});

module.exports = {
  resolve: {
    modules: ["build/dist/lib", "node_modules"],
  },
  entry: {
    // We no longer produce a development bundle.
    // "salve-dom": "main.js",
    "salve-dom.min": "main.js",
  },
  devtool: "source-map",
  output: {
    path: `${__dirname}/build/dist`,
    filename: "[name].js",
    sourceMapFilename: "[name].map.js",
    library: "salve-dom",
    libraryTarget: "umd",
  },
  externals,
};

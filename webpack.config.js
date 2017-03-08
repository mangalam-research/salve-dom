"use strict";
/* global __dirname */

const webpack = require("webpack");

const externals = {};
["salve"].forEach((name) => {
  externals[name] = name;
});

module.exports = {
  resolve: {
    modules: ["build/dist/lib", "node_modules"],
  },
  entry: {
    "salve-dom": "main.js",
    "salve-dom.min": "main.js",
  },
  devtool: "source-map",
  output: {
    path: __dirname + "/build/dist", // eslint-disable-line no-path-concat
    filename: "[name].js",
    sourceMapFilename: "[name].map.js",
    library: "salve-dom",
    libraryTarget: "umd",
  },
  externals,
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
      include: /\.min\.js$/,
    }),
  ],
};

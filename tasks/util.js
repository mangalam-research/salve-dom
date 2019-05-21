"use strict";

const fs = require("fs-extra");

exports.mkdirpAsync = fs.ensureDir.bind(fs);

exports.cprp = function cprp(src, dest) {
  return fs.copy(src, dest, { clobber: true, preserveTimestamps: true });
};

exports.existsInFile = function existsInFile(fpath, re) {
  return fs.readFile(fpath)
    .then(data => data.toString().search(re) !== -1);
};

"use strict";

const childProcess = require("child_process");
const fancyLog = require("fancy-log");
const fs = require("fs-extra");

exports.mkdirpAsync = fs.ensureDir.bind(fs);

exports.cprp = function cprp(src, dest) {
  return fs.copy(src, dest, { clobber: true, preserveTimestamps: true });
};

exports.exec = function exec(command, options) {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, options, (err, stdout, stderr) => {
      if (err) {
        fancyLog(stdout);
        fancyLog(stderr);
        reject(err);
      }
      resolve([stdout.toString(), stderr.toString()]);
    });
  });
};

exports.existsInFile = function existsInFile(fpath, re) {
  return fs.readFile(fpath)
    .then(data => data.toString().search(re) !== -1);
};

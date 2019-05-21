"use strict";

const path = require("path");
const util = require("util");

const glob = util.promisify(require("glob"));

const { cleanTestFile } = require("./xml-util");

const { cprp, existsInFile, mkdirpAsync } = require("./util");

async function convert() {
  const files = await glob("test/data/**", { nodir: true });

  return Promise.all(files.map(async (file) => {
    const ext = path.extname(file);
    const destName = path.join("build/test-files",
                               file.substring(10, file.length - ext.length));
    const dest = `${destName}_converted.xml`;

    const tei = await existsInFile(file, /http:\/\/www.tei-c.org\/ns\/1.0/);

    await mkdirpAsync(path.dirname(dest));
    await (tei ? cleanTestFile(file, dest) : cprp(file, dest));
  }));
}

convert();

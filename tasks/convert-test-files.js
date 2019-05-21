"use strict";

const path = require("path");
const util = require("util");

const glob = util.promisify(require("glob"));

const { cprp, exec, existsInFile, mkdirpAsync } = require("./util");

async function convert() {
  const files = await glob("test/data/**", { nodir: true });

  const xsl = "test/xml-to-xml-tei.xsl";
  return Promise.all(files.map(async (file) => {
    const ext = path.extname(file);
    const destName = path.join("build/test-files",
                               file.substring(10, file.length - ext.length));
    const dest = `${destName}_converted.xml`;

    const tei = await existsInFile(file, /http:\/\/www.tei-c.org\/ns\/1.0/);

    await mkdirpAsync(path.dirname(dest));
    await (tei ? exec(`xsltproc ${xsl} ${file} > ${dest}`) : cprp(file, dest));
  }));
}

convert();

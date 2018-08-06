"use strict";

const path = require("path");
const glob = require("glob");

const { cprp, exec, existsInFile, mkdirpAsync } = require("./util");

glob("test/data/**", { nodir: true }, (err, files) => {
  const xsl = "test/xml-to-xml-tei.xsl";
  const promises = [];
  for (const file of files) {
    const p = (async () => {
      const ext = path.extname(file);
      const destName = path.join("build/test-files",
                                 file.substring(10, file.length - ext.length));
      const dest = `${destName}_converted.xml`;

      const tei = await existsInFile(file, /http:\/\/www.tei-c.org\/ns\/1.0/);
      await mkdirpAsync(path.dirname(dest));
      if (tei) {
        await exec(`xsltproc ${xsl} ${file} > ${dest}`);
      }
      else {
        await cprp(file, dest);
      }
    })();
    promises.push(p);
  }

  Promise.all(promises);
});

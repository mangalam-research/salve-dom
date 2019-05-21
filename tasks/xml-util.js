"use strict";

const { JSDOM } = require("jsdom");
const { promises: fs } = require("fs");

const { serialize } = require("./serializer");

const preserve = ["p", "cit", "lbl", "quote"];
const TEI_URI = "http://www.tei-c.org/ns/1.0";

function walk(node, window) {
  let child = node.firstChild;
  while (child !== null) {
    const next = child.nextSibling;

    const { localName, namespaceURI } = node;
    switch (child.nodeType) {
    case window.Node.TEXT_NODE:
      if (child.textContent.trim() === "" &&
          !(namespaceURI === TEI_URI && preserve.includes(localName))) {
        node.removeChild(child);
      }
      break;
    case window.Node.ELEMENT_NODE:
      walk(child, window);
      break;
    default:
    }

    child = next;
  }
}

async function cleanTestFile(src, dest) {
  const dom = await JSDOM.fromFile(src);

  const { window } = dom;
  const { document } = window;
  walk(document, window);
  await fs.writeFile(dest, `<?xml version="1.0"?>
${serialize(document.documentElement)}
`);
}

exports.cleanTestFile = cleanTestFile;

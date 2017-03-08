import * as fs from "fs";
import * as jsdom from "jsdom";

export interface Parser {
  parse(data: string): Document;
}

export class JSDomParser implements Parser {
  parse(data: string): Document {
    return jsdom.jsdom(data, {
      parsingMode: "xml",
    });
  }
}

export function getParser(): Parser {
  return new JSDomParser();
}

export function getEmptyTree(): Element {
  const document = jsdom.jsdom("");
  const frag = document.createDocumentFragment();
  const emptyTree = document.createElement("div");
  frag.appendChild(emptyTree);
  return emptyTree;
}

export function fetchText(name: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(name, (err: Error | null, data: Buffer) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(data.toString());
    });
  });
}

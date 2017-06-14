export interface Parser {
  parse(data: string): Document;
}

export class MyDOMParser implements Parser {
  parse(data: string): Document {
    return new DOMParser().parseFromString(data, "text/xml");
  }
}

export function getParser(): Parser {
  return new MyDOMParser();
}

export function getEmptyTree(): Element {
  const frag = document.createDocumentFragment();
  const emptyTree = document.createElement("div");
  frag.appendChild(emptyTree);

  return emptyTree;
}

export function fetchText(name: string): Promise<string> {
  return SystemJS.import(`${name}!text`);
}

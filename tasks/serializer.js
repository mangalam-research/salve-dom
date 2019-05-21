/**
 * An XML serializer.
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */

"use strict";

/**
 * Escape characters that cannot be represented literally in XML.
 *
 * @private
 *
 * @param text The text to escape.
 *
 * @param isAttr Whether the text is part of an attribute.
 *
 * @returns The escaped text.
 */
function escape(text, isAttr) {
  // Even though the > escape is not *mandatory* in all cases, we still do it
  // everywhere.
  let ret = text.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (isAttr) {
    ret = ret.replace(/"/g, "&quot;");
  }

  return ret;
}

function serializeDocument(node) {
  if (node.childNodes.length > 1) {
    throw new Error("cannot serialize a document with more than " +
                    "one child node");
  }

  if (node.firstChild === null) {
    throw new Error("cannot serialize an empty document");
  }

  // eslint-disable-next-line no-use-before-define
  return serialize(node.firstChild);
}

function serializeElement(node) {
  const { tagName, attributes } = node;
  let out = `<${tagName}`;

  for (const attr of attributes) {
    out += ` ${attr.name}="${escape(attr.value, true)}"`;
  }
  if (node.childNodes.length === 0) {
    out += "/>";
  }
  else {
    out += ">";
    let child = node.firstChild;
    while (child !== null) {
      // eslint-disable-next-line no-use-before-define
      out += serialize(child);
      child = child.nextSibling;
    }
    out += `</${tagName}>`;
  }

  return out;
}

function serializeText({ data }) {
  return escape(data, false);
}

function serializeCData({ data }) {
  return `<![CDATA[${data}]]>`;
}

function serializeComment({ data }) {
  return `<!--${data}-->`;
}

function serializePI({ target, data }) {
  return `<?${target} ${data}?>`;
}

const typeToHandler = [
  undefined,
  serializeElement,
  undefined, // Attribute,
  serializeText,
  serializeCData,
  undefined, // Entity Reference
  undefined, // Entity,
  serializePI,
  serializeComment,
  serializeDocument,
  undefined, // DocumentType
  serializeDocument, // DocumentFragment
];


/**
 * Serialize an XML tree. This serializer implements only as much as testing
 * currently needs.
 *
 * @param root The root of the document.
 *
 * @returns The serialized document.
 */
function serialize(node) {
  const handler = typeToHandler[node.nodeType];
  if (handler === undefined) {
    throw new Error(`can't handle node of type: ${node.nodeType}`);
  }
  return handler(node);
}

exports.serialize = serialize;

//  LocalWords:  MPL lt nodeType CDATA

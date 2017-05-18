/**
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
import "chai";
import "mocha";
import * as salve from "salve";
import { Validator } from "salve-dom";
import * as main from "salve-dom";
import * as util from "./util";

const assert = chai.assert;

function testFile(name: string): string {
  return `build/test-files/${name}`;
}

describe("Webpack test", () => {
  let parser: util.Parser;
  let emptyTree: Element;

  let grammar: salve.Grammar;
  let genericTree: Document;

  before(() => {
    parser = util.getParser();
    emptyTree = util.getEmptyTree();
    return Promise.all([
      util.fetchText("test/schemas/simplified-rng.js")
        .then((text) => grammar = salve.constructTree(text)),
      util.fetchText(testFile("to_parse_converted.xml"))
        .then((text) => genericTree = parser.parse(text)),
    ]);
  });

  function makeValidator(tree: Element | Document): Validator {
    return new Validator(grammar, tree, {
      maxTimespan: 0,
    });
  }

  it("with actual contents", (done) => {
    const p = makeValidator(genericTree.cloneNode(true) as Document);

    // Manipulate stop so that we know when the work is done.
    const oldStop = p.stop;
    p.stop = function stop(): void {
      oldStop.call(p);
      assert.equal(p.getWorkingState().state, main.WorkingState.VALID);
      assert.equal(p.errors.length, 0);
      done();
    };

    p.start();
  });
});

//  LocalWords:  enterStartTag html jQuery Dubeau MPL Mangalam config
//  LocalWords:  RequireJS requirejs subdirectory validator jquery js
//  LocalWords:  chai baseUrl rng

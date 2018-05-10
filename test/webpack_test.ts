/**
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
import "chai";
import "mocha";
import * as salve from "salve";
// tslint:disable-next-line:no-implicit-dependencies
import { Validator, WorkingState, WorkingStateData } from "salve-dom";
import * as util from "./util";

const assert = chai.assert;

function testFile(name: string): string {
  return `build/test-files/${name}`;
}

// We cannot trivially move this to util and share the code with the regular
// tests. The imports for the types used have to be done differently. Or we have
// to ditch precise type annotations.
export function onCompletion(p: Validator, cb: () => void): void {
  p.events.addEventListener("state-update", (state: WorkingStateData) => {
    if (!(state.state === WorkingState.VALID ||
          state.state === WorkingState.INVALID)) {
      return;
    }
    cb();
  });
}

describe("Webpack test", () => {
  let parser: util.Parser;
  let grammar: salve.Grammar;
  let genericTree: Document;

  before(() => {
    parser = util.getParser();

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
    onCompletion(p, () => {
      assert.equal(p.getWorkingState().state, WorkingState.VALID);
      assert.equal(p.errors.length, 0);
      done();
    });

    p.start();
  });
});

//  LocalWords:  enterStartTag html jQuery Dubeau MPL Mangalam config
//  LocalWords:  RequireJS requirejs subdirectory validator jquery js
//  LocalWords:  chai baseUrl rng

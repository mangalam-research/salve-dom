/**
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
import "chai";
import { ErrorData, isAttr, Options, ParsingError, ResetData, safeParse,
         /* tslint:disable-next-line:no-implicit-dependencies
            no-submodule-imports */
         Validator, WorkingState as WS, WorkingStateData } from "dist/lib/main";
import "mocha";
import { DefaultNameResolver, EName, EndTagEvent, EnterStartTagEvent, Event,
         EventSet, Grammar, GrammarWalker, LeaveStartTagEvent, Name,
         readTreeFromJSON, TextEvent } from "salve";
import * as util from "./util";

const assert = chai.assert;
const expect = chai.expect;

function testFile(name: string): string {
  return `build/test-files/${name}`;
}

const _indexOf = Array.prototype.indexOf;

// Ick. ``assert.fail`` should be defined with ``never`` but it is defined with
// ``void``. This fixes the problem for our own purposes here.
function fail(message: string): never {
  assert.fail(message);
  throw new Error("moo"); // We won't ever get here but let's please TypeScript.
}

class CustomValidator extends Validator {
  ranDV: boolean = false;

  _runDocumentValidation(): void {
    this.ranDV = true;
  }
}

function onCompletion(p: Validator, cb: () => void): void {
  p.events.addEventListener("state-update", (state: WorkingStateData) => {
    if (!(state.state === WS.VALID || state.state === WS.INVALID)) {
      return;
    }
    cb();
  });
}

const verbose = false;

function sameEvents(evs: EventSet, expected: Event[]): void {
  expect(Array.from(evs).map((x) => x.toString())).to.have
    .members(expected.map((x) => x.toString()));
}

describe("Validator", () => {
  let parser: util.Parser;
  let emptyTree: Element;

  let teiSchemaGrammar: Grammar;
  let grammar: Grammar;
  let genericTree: Document;
  let multipleNamespacesTree: Document;
  let percentToParseTree: Document;
  let moreNodeTypes: Document;

  before(async function before(): Promise<void> {
    // We have a high timeout here because IE11 on Browser Stack often takes
    // its sweet old time here.
    // tslint:disable-next-line:no-invalid-this
    this.timeout(4000);
    parser = util.getParser();
    emptyTree = util.getEmptyTree();

    ([grammar, teiSchemaGrammar, multipleNamespacesTree, percentToParseTree,
      genericTree, moreNodeTypes] =
     await Promise.all([
       util.fetchText("test/schemas/simplified-rng.js").then(readTreeFromJSON),
       util.fetchText("test/schemas/tei-simplified-rng.js")
         .then(readTreeFromJSON),
       util.fetchText(
         testFile("multiple_namespaces_on_same_node_converted.xml"))
         .then((text) => parser.parse(text)),
       util.fetchText(testFile("percent_to_parse_converted.xml"))
         .then((text) => parser.parse(text)),
       util.fetchText(testFile("to_parse_converted.xml"))
         .then((text) => parser.parse(text)),
       util.fetchText(testFile("more_node_types_converted.xml"))
         .then((text) => parser.parse(text)),
     ]));
  });

  const settings: (keyof Options)[] =
    ["timeout", "maxTimespan", "walkerCacheGap"];
  for (const setting of settings) {
    it(`fails when a ${setting} is less than 0`, () => {
      const options: Options = {};
      options[setting] = -1;
      assert.throws(
        () => new Validator(grammar, emptyTree, options),
        Error,
        `the value for ${setting} cannot be negative`);
    });
  }

  describe(!verbose ? "" : "first block", () => {
    function makeValidator(tree: Element | Document): Validator {
      return new Validator(grammar, tree, {
        maxTimespan: 0,
      });
    }

    it("with an empty document", (done) => {
      const p = makeValidator(emptyTree);

      onCompletion(p, () => {
        assert.equal(p.getWorkingState().state, WS.INVALID);
        const errors = p.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].error.toString(),
                     "tag required: {\"ns\":\"\",\"name\":\"html\"}");
        done();
      });

      p.start();
    });

    it("runs _runDocumentValidation", (done) => {
      const p = new CustomValidator(grammar, emptyTree, {
        maxTimespan: 0,
      });

      onCompletion(p, () => {
        assert.isTrue(p.ranDV);
        done();
      });

      p.start();
    });

    it("emits error event", (done) => {
      const p = makeValidator(emptyTree);

      // Manipulate stop so that we know when the work is done.
      p.events.addEventListener("error", (ev: ErrorData) => {
        assert.equal(ev.error.toString(),
                     "tag required: {\"ns\":\"\",\"name\":\"html\"}");
        assert.equal(ev.node, emptyTree);
        done();
      });

      p.start();
    });

    it("allows listening to *", (done) => {
      const p = makeValidator(emptyTree);

      // Manipulate stop so that we know when the work is done.
      p.events.addOneTimeEventListener("*", () => {
        done();
      });

      p.start();
    });

    it("with actual contents", (done) => {
      const p = makeValidator(genericTree.cloneNode(true) as Document);

      onCompletion(p, () => {
        assert.equal(p.getWorkingState().state, WS.VALID);
        assert.equal(p.errors.length, 0);
        done();
      });

      p.start();
    });

    it("with all node types", (done) => {
      const p = makeValidator(moreNodeTypes.cloneNode(true) as Document);

      onCompletion(p, () => {
        assert.equal(p.getWorkingState().state, WS.VALID);
        assert.equal(p.errors.length, 0);
        done();
      });

      p.start();
    });

    // This test was added in response to a bug that surfaced when
    // wed moved from HTML to XML for the data tree.
    it("with two namespaces on the same node", (done) => {
      const tree = multipleNamespacesTree.cloneNode(true);
      const p = new Validator(teiSchemaGrammar, tree as Document, {
        maxTimespan: 0, // Work forever.
      });

      onCompletion(p, () => {
        assert.equal(p.getWorkingState().state, WS.VALID);
        assert.equal(p.errors.length, 0);
        done();
      });

      p.start();
    });

    it("percent done", () => {
      const tree = percentToParseTree.cloneNode(true) as Document;
      const p = makeValidator(tree);
      function cycle(): void {
        (p as any)._cycle();
      }
      cycle(); // <html>
      assert.equal(p.getWorkingState().partDone, 0);
      cycle(); // <head>
      assert.equal(p.getWorkingState().partDone, 0);
      cycle(); // <title>
      assert.equal(p.getWorkingState().partDone, 0);
      cycle(); // <title>
      assert.equal(p.getWorkingState().partDone, 0.5);
      cycle(); // </head>
      assert.equal(p.getWorkingState().partDone, 0.5);
      cycle(); // <body>
      assert.equal(p.getWorkingState().partDone, 0.5);
      cycle(); // <em>
      assert.equal(p.getWorkingState().partDone, 0.5);
      cycle(); // </em>
      assert.equal(p.getWorkingState().partDone, 0.75);
      cycle(); // <em>
      assert.equal(p.getWorkingState().partDone, 0.75);
      cycle(); // <em>
      assert.equal(p.getWorkingState().partDone, 0.75);
      cycle(); // </em>
      assert.equal(p.getWorkingState().partDone, 0.875);
      cycle(); // <em>
      assert.equal(p.getWorkingState().partDone, 0.875);
      cycle(); // </em>
      assert.equal(p.getWorkingState().partDone, 1);
      cycle(); // </em>
      assert.equal(p.getWorkingState().partDone, 1);
      cycle(); // </body>
      assert.equal(p.getWorkingState().partDone, 1);
      cycle(); // </html>
      assert.equal(p.getWorkingState().partDone, 1);
      cycle(); // end
      const finalState = p.getWorkingState();
      assert.equal(finalState.partDone, 1);
      assert.equal(finalState.state, WS.VALID);
      assert.equal(p.errors.length, 0);
    });

    it("restart at", (done) => {
      const tree = genericTree.cloneNode(true) as Document;
      const p = makeValidator(tree);
      let first = true;
      onCompletion(p, () => {
        assert.equal(p.getWorkingState().state, WS.VALID);
        assert.equal(p.errors.length, 0);
        // Deal with first invocation and subsequent
        // differently.
        if (first) {
          first = false;
          p.restartAt(tree);
        }
        else {
          done();
        }
      });
      p.start();
    });

    it("restart at triggers reset-errors event", (done) => {
      const tree = genericTree.cloneNode(true) as Document;
      const p = makeValidator(tree);

      let first = true;
      let gotReset = false;
      onCompletion(p, () => {
        assert.equal(p.getWorkingState().state, WS.VALID);
        assert.equal(p.errors.length, 0);
        // Deal with first invocation and subsequent differently.
        if (first) {
          first = false;
          p.restartAt(tree);
        }
        else {
          assert.equal(gotReset, true);
          done();
        }
      });
      p.events.addEventListener("reset-errors", (ev: ResetData) => {
        assert.equal(ev.at, 0);
        gotReset = true;
      });

      p.start();
    });

    //
    // This test was added to handle problem with the internal state of the
    // validator.
    //
    it("restart at and getErrorsFor", (done) => {
      const tree = genericTree.cloneNode(true) as Document;
      const p = makeValidator(tree);
      let times = 0;
      onCompletion(p, () => {
        assert.equal(p.getWorkingState().state, WS.VALID);
        assert.equal(p.errors.length, 0);
        // Deal with first invocation and subsequent
        // differently.
        if (times === 0) {
          setTimeout(() => {
              p.restartAt(tree);
              p.getErrorsFor(tree.getElementsByTagName("em")[0]);
              p.restartAt(tree);
          },
                     0);
        }
        else {
          done();
        }
        times++;
      });

      p.start();
    });
  });

  describe(!verbose ? "" : "second block", () => {
    let tree: Document;
    before(async () => {
      tree =
        parser.parse(await util.fetchText(testFile("wildcard_converted.xml")));
    });

    function makeValidator(prefix?: string): Validator {
      return new Validator(grammar, tree, {
        maxTimespan: 0, // Work forever.
        prefix,
      });
    }

    it("emits correct possible-due-to-wildcard-change events", (done) => {
      // Manipulate stop so that we know when the work is done.
      const p = makeValidator();
      let count = 0;
      p.events.addEventListener(
        "possible-due-to-wildcard-change",
        (node: Node) => {
          assert.isTrue(node.nodeType === Node.ELEMENT_NODE || isAttr(node));
          assert.isDefined((node as any).salveDomPossibleDueToWildcard);
          if (node instanceof Element) {
            if (node.tagName === "foo:bar") {
              assert.isTrue((node as any).salveDomPossibleDueToWildcard);
            }
            else {
              assert.isFalse((node as any).salveDomPossibleDueToWildcard);
            }
          }
          else if (isAttr(node) &&
                   (node.name === "foo:baz" || node.name === "baz")) {
            assert.isTrue((node as any).salveDomPossibleDueToWildcard);
          }
          else {
            assert.isFalse((node as any).salveDomPossibleDueToWildcard);
          }
          count++;
        });

      onCompletion(p, () => {
        assert.equal(count, 11);
        done();
      });
      p.start();
    });

    it("uses the prefix option", (done) => {
      // Manipulate stop so that we know when the work is done.
      const p = makeValidator("myprefix");
      let count = 0;
      p.events.addEventListener(
        "possible-due-to-wildcard-change",
        (node: Node) => {
          assert.isDefined((node as any).myprefixPossibleDueToWildcard);
          count++;
        });

      onCompletion(p, () => {
        assert.isTrue(count > 0);
        done();
      });
      p.start();
    });
  });

  // Testing possibleAt also tests _validateUpTo because it depends on that
  // function.
  describe("possibleAt", () => {
    let badTree: Document;

    before(() => {
      badTree = genericTree.cloneNode(true) as Document;
      const em = badTree.getElementsByTagName("em")[0];
      em.setAttribute("xxx", "x");
    });

    function makeTest(name: string,
                      stopFn: (p: Validator, tree: Document | Element) => void,
                      top?: () => Document | Element,
                      only: boolean = false): void {
      (only ? it.only : it)(name, () => {
        const tree = (top !== undefined ? top().cloneNode(true) :
                      genericTree.cloneNode(true)) as Document;
        const p = new Validator(grammar, tree);
        stopFn(p, tree);
      });
    }

    makeTest("empty document, at root", (p) => {
      const evs = p.possibleAt(emptyTree, 0);
      sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "html"))]);
    },
             () => emptyTree);

    // There was an earlier problem by which using _getWalkerAt could
    // cause errors to get recorded more than once.
    makeTest("does not duplicate errors", (p, tree) => {
      assert.equal(p.errors.length, 0);
      const em = tree.getElementsByTagName("em")[0];
      const xxx = em.getAttributeNode("xxx")!;
      p.possibleAt(xxx, 0);
      assert.equal(p.errors.length, 1);
      p.possibleAt(xxx, 1);
      assert.equal(p.errors.length, 1);
    },
             () => badTree);

    describe("with actual contents", () => {
      makeTest("at root", (p, tree) => {
        const evs = p.possibleAt(tree, 0);
        sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "html"))]);
      });

      makeTest("at end", (p, tree) => {
        const evs = p.possibleAt(tree, 1);
        assert.equal(evs.size, 0);
      });

      makeTest("start of html", (p, tree) => {
        const evs = p.possibleAt(tree.getElementsByTagName("html")[0], 0);
        sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "head"))]);
      });

      makeTest("start of head", (p, tree) => {
        const evs = p.possibleAt(tree.getElementsByTagName("head")[0], 0);
        sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "title"))]);
      });

      makeTest("start of title (start of text node)", (p, tree) => {
        const el = tree.getElementsByTagName("title")[0].firstChild as Text;
        // Make sure we know what we are looking at.
        assert.equal(el.nodeType, Node.TEXT_NODE);
        const evs = p.possibleAt(el, 0);
        sameEvents(evs, [new EndTagEvent(new Name("", "", "title")),
                         new TextEvent(/^[^]*$/)]);
      });

      makeTest("index inside text node", (p, tree) => {
        const el = tree.getElementsByTagName("title")[0].firstChild as Text;
        // Make sure we know what we are looking at.
        assert.equal(el.nodeType, Node.TEXT_NODE);
        const evs = p.possibleAt(el, 1);
        sameEvents(evs, [new EndTagEvent(new Name("", "", "title")),
                         new TextEvent(/^[^]*$/)]);
      });

      makeTest("end of title", (p, tree) => {
        const title = tree.getElementsByTagName("title")[0];
        const evs = p.possibleAt(title, title.childNodes.length);
        sameEvents(evs, [new EndTagEvent(new Name("", "", "title")),
                         new TextEvent(/^[^]*$/)]);
      });

      makeTest("end of head", (p, tree) => {
        const el = tree.getElementsByTagName("head")[0];
        const evs = p.possibleAt(el, el.childNodes.length);
        sameEvents(evs, [new EndTagEvent(new Name("", "", "head"))]);
      });

      makeTest("after head", (p, tree) => {
        const el = tree.getElementsByTagName("head")[0];
        const evs = p.possibleAt(
          el.parentNode!,
          _indexOf.call(el.parentNode!.childNodes, el) + 1);
        sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "body"))]);
      });

      makeTest("attributes on root", (p, tree) => {
        const evs = p.possibleAt(tree, 0, true);
        sameEvents(evs, [new LeaveStartTagEvent()]);
      });

      makeTest("attributes on element", (p, tree) => {
        const el = tree.getElementsByTagName("head")[0];
        const evs = p.possibleAt(el.parentNode!,
                                 _indexOf.call(el.parentNode!.childNodes, el),
                                 true);
        sameEvents(evs, [new LeaveStartTagEvent()]);
      });
    });

    describe("with various node types", () => {
      function makeCommentTest(name: string,
                               stopFn: (p: Validator, parent: Node,
                                        index: number, comment: Node) => void,
                               only: boolean = false): void {
        makeTest(name, (p, tree) => {
          const title = tree.getElementsByTagName("title")[0];
          const index = 1;
          const comment = title.childNodes[index];
          expect(comment).to.have.property("nodeType").equal(Node.COMMENT_NODE);
          stopFn(p, title, index, comment);
        },
                 () => moreNodeTypes,
                 only);
      }

      makeCommentTest("before comment", (p, parent, index) => {
        const evs = p.possibleAt(parent, index);
        sameEvents(evs, [new EndTagEvent(new Name("", "", "title")),
                         new TextEvent(/^[^]*$/)]);
      });

      makeCommentTest("after comment", (p, parent, index) => {
        const evs = p.possibleAt(parent, index + 1);
        sameEvents(evs, [new EndTagEvent(new Name("", "", "title")),
                         new TextEvent(/^[^]*$/)]);
      });

      makeCommentTest("in comment", (p, _parent, _index, comment) => {
        const evs = p.possibleAt(comment, 0);
        sameEvents(evs, [new EndTagEvent(new Name("", "", "title")),
                         new TextEvent(/^[^]*$/)]);
      });

      function makePITest(name: string,
                          stopFn: (p: Validator, parent: Node,
                                   index: number, pi: Node) => void,
                          only: boolean = false): void {
        makeTest(name, (p, tree) => {
          const html = tree.getElementsByTagName("html")[0];
          const index = 1;
          const pi = html.childNodes[index];
          expect(pi).to.have.property("nodeType")
            .equal(Node.PROCESSING_INSTRUCTION_NODE);
          stopFn(p, html, index, pi);
        },
                 () => moreNodeTypes,
                 only);
      }

      makePITest("before pi", (p, parent, index) => {
        const evs = p.possibleAt(parent, index);
        sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "head"))]);
      });

      makePITest("after pi", (p, parent, index) => {
        const evs = p.possibleAt(parent, index + 1);
        sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "head"))]);
      });

      makePITest("in pi", (p, _parent, _index, pi) => {
        const evs = p.possibleAt(pi, 0);
        sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "head"))]);
      });

      function makeCDATATest(name: string,
                             stopFn: (p: Validator, parent: Node,
                                      index: number, cdata: Node) => void,
                             only: boolean = false): void {
        makeTest(name, (p, tree) => {
          const html = tree.getElementsByTagName("em")[0];
          const index = 1;
          const cdata = html.childNodes[index];
          expect(cdata).to.have.property("nodeType")
            .equal(Node.CDATA_SECTION_NODE);
          stopFn(p, html, index, cdata);
        },
                 () => moreNodeTypes,
                 only);
      }

      makeCDATATest("before cdata", (p, parent, index) => {
        const evs = p.possibleAt(parent, index);
        sameEvents(evs, [new EndTagEvent(new Name("", "", "em")),
                         new EnterStartTagEvent(new Name("", "", "em")),
                         new TextEvent(/^[^]*$/)]);
      });

      makeCDATATest("after cdata", (p, parent, index) => {
        const evs = p.possibleAt(parent, index + 1);
        sameEvents(evs, [new EndTagEvent(new Name("", "", "em")),
                         // Yes, possibleAt can return duplicate events.
                         new EnterStartTagEvent(new Name("", "", "em")),
                         new EnterStartTagEvent(new Name("", "", "em")),
                         new TextEvent(/^[^]*$/)]);
      });

      makeCDATATest("in cdata", (p, _parent, _index, cdata) => {
        const evs = p.possibleAt(cdata, 1);
        sameEvents(evs, [new EndTagEvent(new Name("", "", "em")),
                         new EnterStartTagEvent(new Name("", "", "em")),
                         new TextEvent(/^[^]*$/)]);
      });
    });
  });

  describe("_getWalkerAt", () => {
    interface Reveal {
      _getWalkerAt(container: Node, index: number,
                   attributes: boolean): GrammarWalker<DefaultNameResolver>;
      _walkerCache: {[key: number]: GrammarWalker<DefaultNameResolver>};
      _walkerCacheMax: number;
    }

    function reveal(p: Validator): Reveal {
      return p as any as Reveal;
    }

    function makeTest(name: string,
                      stopFn: (p: Validator, tree: Document | Element) => void,
                      top?: () => (Document | Element)): void {
      it(name, () => {
        const tree = (top !== undefined ? top().cloneNode(true) :
                      genericTree.cloneNode(true)) as Document;
        const p = new Validator(grammar, tree);
        stopFn(p, tree);
      });
    }

    describe("returns correct walker", () => {
      makeTest(
        "empty document, at root",
        (p, tree) => {
          const walker = reveal(p)._getWalkerAt(tree, 0, false);
          const evs = walker.possible();
          sameEvents(evs,
                     [new EnterStartTagEvent(new Name("", "", "html"))]);
        },
        () => emptyTree);

      makeTest("at root", (p, tree) => {
        const walker = reveal(p)._getWalkerAt(tree, 0, false);
        const evs = walker.possible();
        sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "html"))]);
      });

      makeTest("at end", (p, tree) => {
        const walker = reveal(p)._getWalkerAt(tree, -1, false);
        const evs = walker.possible();
        assert.equal(evs.size, 0);
      });

      makeTest("start of html", (p, tree) => {
        const walker =
          reveal(p)._getWalkerAt(tree.getElementsByTagName("html")[0],
                                 0, false);
        const evs = walker.possible();
        sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "head"))]);
      });

      makeTest("start of head", (p, tree) => {
        const walker =
          reveal(p)._getWalkerAt(tree.getElementsByTagName("head")[0],
                                 0, false);
        const evs = walker.possible();
        sameEvents(evs,
                   [new EnterStartTagEvent(new Name("", "", "title"))]);
      });

      makeTest("start of title (start of text node)", (p, tree) => {
        const el = tree.getElementsByTagName("title")[0].firstChild!;
        // Make sure we know what we are looking at.
        assert.equal(el.nodeType, Node.TEXT_NODE);
        const walker = reveal(p)._getWalkerAt(el, 0, false);
        const evs = walker.possible();
        sameEvents(evs, [new EndTagEvent(new Name("", "", "title")),
                         new TextEvent(/^[^]*$/)]);
      });

      makeTest("index inside text node", (p, tree) => {
        const el = tree.getElementsByTagName("title")[0].firstChild!;
        // Make sure we know what we are looking at.
        assert.equal(el.nodeType, Node.TEXT_NODE);
        const walker = reveal(p)._getWalkerAt(el, 1, false);
        const evs = walker.possible();
        sameEvents(evs, [new EndTagEvent(new Name("", "", "title")),
                         new TextEvent(/^[^]*$/)]);
      });

      makeTest("end of title", (p, tree) => {
        const title = tree.getElementsByTagName("title")[0];
        const walker =
          reveal(p)._getWalkerAt(title, title.childNodes.length, false);
        const evs = walker.possible();
        sameEvents(evs, [new EndTagEvent(new Name("", "", "title")),
                         new TextEvent(/^[^]*$/)]);
      });

      makeTest("end of head", (p, tree) => {
        const el = tree.getElementsByTagName("head")[0];
        const walker = reveal(p)._getWalkerAt(el, el.childNodes.length, false);
        const evs = walker.possible();
        sameEvents(evs, [new EndTagEvent(new Name("", "", "head"))]);
      });

      makeTest("after head", (p, tree) => {
        const el = tree.getElementsByTagName("head")[0];
        const walker = reveal(p)._getWalkerAt(
          el.parentNode!, _indexOf.call(el.parentNode!.childNodes, el) + 1,
          false);
        const evs = walker.possible();
        sameEvents(evs, [new EnterStartTagEvent(new Name("", "", "body"))]);
      });

      makeTest("attributes on root", (p, tree) => {
        const walker = reveal(p)._getWalkerAt(tree, 0, true);
        const evs = walker.possible();
        sameEvents(evs, [new LeaveStartTagEvent()]);
      });

      makeTest("attributes on element", (p, tree) => {
        const el = tree.getElementsByTagName("head")[0];
        const walker = reveal(p)._getWalkerAt(
          el.parentNode!, _indexOf.call(el.parentNode!.childNodes, el), true);
        const evs = walker.possible();
        sameEvents(evs, [new LeaveStartTagEvent()]);
      });

      makeTest("attributes on element with prev sibling", (p, tree) => {
        const el = tree.getElementsByTagName("body")[0];
        // Check our precondition. We want to test an element which has a
        // previous element sibling.
        assert.isNotNull(el.previousElementSibling, "precondition failure");
        const walker = reveal(p)._getWalkerAt(
          el.parentNode!, _indexOf.call(el.parentNode!.childNodes, el), true);
        const evs = walker.possible();
        sameEvents(evs, [new LeaveStartTagEvent()]);
      });
    });

    describe("handles namespace attributes", () => {
      let defaultTree: Document;
      before(() => util
             .fetchText(
               testFile("multiple_namespaces_on_same_node_converted.xml"))
             .then((text) => defaultTree = parser.parse(text)));

      // tslint:disable-next-line:no-shadowed-variable
      function makeTest(name: string,
                        stopFn: (p: Validator,
                                 tree: Document | Element) => void): void {
        it(name, () => {
          const tree = defaultTree.cloneNode(true) as Document;
          const p = new Validator(teiSchemaGrammar, tree);
          stopFn(p, tree);
        });
      }

      makeTest("up to an xmlns node", (p, tree) => {
        // This tests that validating up to an xmlns attribute
        // is not causing an error.
        const el = tree.getElementsByTagName("TEI")[0];
        const attribute = el.attributes.getNamedItem("xmlns")!;
        const walker = reveal(p)._getWalkerAt(attribute, 0, false);
        walker.possible();
        assert.equal(p.errors.length, 0);
      });

      makeTest("up to an xmlns:... node", (p, tree) => {
        // This tests that validating up to an xmlns:... attribute
        // is not causing an error.
        const el = tree.getElementsByTagName("TEI")[0];
        const attribute = el.attributes.getNamedItem("xmlns:foo")!;
        const walker = reveal(p)._getWalkerAt(attribute, 0, false);
        walker.possible();
        assert.equal(p.errors.length, 0);
      });
    });

    describe("caches", () => {
      let dataTree: Document;
      before(() => util.fetchText(testFile("caching_to_parse_converted.xml"))
             .then((text) => {
               dataTree = parser.parse(text);
             }));

      // tslint:disable-next-line:no-shadowed-variable
      function makeTest(name: string,
                        stopFn: (p: Validator, revealed: Reveal,
                                 tree: Document | Element) => void,
                        top?: () => (Document | Element)): void {
        it(name, () => {
          const tree = (top !== undefined ? top().cloneNode(true) :
                        dataTree.cloneNode(true)) as Document;
          const p = new Validator(grammar, tree);
          assert.equal(Object.keys((p as any)._walkerCache).length, 0);
          assert.equal((p as any)._walkerCacheMax, -1);
          stopFn(p, reveal(p), tree);
        });
      }

      makeTest(
        "but not at the first position", (
          _p, revealed, tree) => {
          // There is no point in caching the very first position in the
          // document, as creating a new walker is as fast or perhaps faster
          // than cloning a walker.

          revealed._getWalkerAt(tree, 0, false);
          assert.equal(revealed._walkerCacheMax, -1);
          assert.equal(Object.keys(revealed._walkerCache).length, 0);
        },
        () => emptyTree);

      makeTest("but not the final location", (_p, revealed, tree) => {
        revealed._getWalkerAt(tree, -1, false);
        assert.equal(revealed._walkerCacheMax, -1);
        assert.equal(Object.keys(revealed._walkerCache).length, 0);
      });

      makeTest("some walker (element)", (_p, revealed, tree) => {
        const initialMax = revealed._walkerCacheMax;
        const el = tree.getElementsByTagName("em")[100];
        const walker = revealed._getWalkerAt(el, 0, false);
        assert.isTrue(revealed._walkerCacheMax > initialMax);
        assert.equal(Object.keys(revealed._walkerCache).length, 1);
        assert.equal(walker, revealed._getWalkerAt(el, 0, false));
      });

      makeTest("but does not cache walkers that are too close (element)",
               (_p, revealed, tree) => {
                 const initialMax = revealed._walkerCacheMax;
                 const el = tree.getElementsByTagName("em")[100];
                 revealed._getWalkerAt(el, 0, false);
                 const maxAfterFirst = revealed._walkerCacheMax;
                 assert.isTrue(maxAfterFirst > initialMax);
                 assert.equal(Object.keys(revealed._walkerCache).length, 1);
                 // It won't cache this walker because it is too close
                 // to the previous one.
                 revealed._getWalkerAt(el, 1, false);
                 assert.equal(maxAfterFirst, revealed._walkerCacheMax);
                 assert.equal(Object.keys(revealed._walkerCache).length, 1);
               });

      makeTest("some walker (text)", (_p, revealed, tree) => {
        const initialMax = revealed._walkerCacheMax;
        const el = tree.getElementsByTagName("em")[100];
        assert.equal(el.firstChild!.nodeType, Node.TEXT_NODE);
        const walker = revealed._getWalkerAt(el.firstChild!, 0, false);
        assert.isTrue(revealed._walkerCacheMax > initialMax);
        assert.equal(Object.keys(revealed._walkerCache).length, 1);
        assert.equal(walker, revealed._getWalkerAt(el.firstChild!, 0, false));
      });

      makeTest("does not cache walkers that are too close (text)",
               (_p, revealed, tree) => {
                 const initialMax = revealed._walkerCacheMax;
                 const el = tree.getElementsByTagName("em")[100];
                 assert.equal(el.firstChild!.nodeType, Node.TEXT_NODE);
                 revealed._getWalkerAt(el.firstChild!, 0, false);
                 const maxAfterFirst = revealed._walkerCacheMax;
                 assert.isTrue(maxAfterFirst > initialMax);
                 assert.equal(Object.keys(revealed._walkerCache).length, 1);
                 // It won't cache this walker because it is too close to the
                 // previous one.
                 revealed._getWalkerAt(el.firstChild!, 1, false);
                 assert.equal(maxAfterFirst, revealed._walkerCacheMax);
                 assert.equal(Object.keys(revealed._walkerCache).length, 1);
               });

      makeTest("some walker (attribute)", (_p, revealed, tree) => {
        const initialMax = revealed._walkerCacheMax;
        const el = tree.getElementsByTagName("em")[100];
        const attr = el.attributes.getNamedItem("foo")!;
        assert.isDefined(attr);
        revealed._getWalkerAt(attr, 0, false);
        assert.isTrue(revealed._walkerCacheMax > initialMax);
        assert.equal(Object.keys(revealed._walkerCache).length, 1);
        // Even though caching was used, the walker won't be the same.
        // assert.equal(walker, revealed._getWalkerAt(attr, 0, false));
      });
    });
  });

  describe("possibleWhere", () => {
    function makeTest(name: string,
                      stopFn: (p: Validator, tree: Document | Element) => void):
    void {
      it(name, (done) => {
        const tree = genericTree.cloneNode(true) as Document;
        const p = new Validator(grammar, tree, {
          maxTimespan: 0,
        });
        onCompletion(p, () => {
          stopFn(p, tree);
          done();
        });
        p.start();
      });
    }

    makeTest("multiple locations", (p, tree) => {
      const el = tree.querySelector("body");
      const locs = p.possibleWhere(el!, "enterStartTag", "", "em");
      assert.sameMembers(locs, [0, 1, 2, 3]);
    });

    makeTest("no locations", (p, tree) => {
      const el = tree.querySelector("title");
      const locs =
        p.possibleWhere(el!, "enterStartTag", "", "impossible");
      assert.sameMembers(locs, []);
    });

    makeTest("one location", (p, tree) => {
      const el = tree.querySelector("html");
      const locs = p.possibleWhere(el!, "enterStartTag", "", "body");
      assert.sameMembers(locs, [2, 3]);
    });

    makeTest("empty element", (p, tree) => {
      const el = tree.querySelector("em em");
      const locs = p.possibleWhere(el!, "enterStartTag", "", "em");
      assert.sameMembers(locs, [0]);
    });

    makeTest("match due to wildcard", (p, tree) => {
      const el = tree.querySelector("body");
      // The way the schema is structured, the following element can match only
      // due to a wildcard. So the code of possibleWhere has to check every
      // possibility one by one rather than use ``.has`` on the event set.
      const locs = p.possibleWhere(el!, "enterStartTag", "uri", "foreign");
      assert.sameMembers(locs, [0, 1, 2, 3]);
    });
  });

  // We test speculativelyValidateFragment through speculativelyValidate
  describe("speculativelyValidate", () => {
    let p: Validator;
    let tree: Document;

    before(() => {
      tree = genericTree.cloneNode(true) as Document;
      p = new Validator(grammar, tree, {
        maxTimespan: 0, // Work forever.
      });
    });

    it("does not report errors on valid fragments", () => {
      const body = tree.getElementsByTagName("body")[0];
      const container = body.parentNode!;
      const index = _indexOf.call(container.childNodes, body);
      const ret = p.speculativelyValidate(container, index, body);
      assert.isFalse(ret);
    });

    it("reports errors on invalid fragments (undefined tag namespace)",
       () => {
         const body = tree.getElementsByTagName("body")[0];
         const container = body.parentNode!;
         const index = _indexOf.call(container.childNodes, body);
         const em = body.ownerDocument!.createElementNS("unknown",
                                                        "foo:unknown");
         const ret = p.speculativelyValidate(container, index, em);
         if (ret instanceof Array) {
           assert.equal(ret.length, 2);
           assert.equal(ret[0].error.toString(),
                        "cannot resolve the name foo:unknown");
           assert.equal(
             ret[1].error.toString(),
             "tag not allowed here: {\"ns\":\"\",\"name\":\"foo:unknown\"}");
         }
         else {
           fail("ret is not an array");
         }
       });

    it("reports errors on invalid fragments (undefined attribute namespace)",
       () => {
         const body = tree.getElementsByTagName("body")[0];
         const container = body.parentNode!;
         const index = _indexOf.call(container.childNodes, body);
         const fakeBody = body.ownerDocument!.createElement("body");
         fakeBody.textContent = "foo";
         fakeBody.setAttributeNS("unknown", "foo:unknown", "value");
         const ret = p.speculativelyValidate(container, index, fakeBody);
         if (ret instanceof Array) {
           assert.equal(ret.length, 1);
           assert.equal(ret[0].error.toString(),
                        "cannot resolve attribute name foo:unknown");
         }
         else {
           fail("ret is not an array");
         }
       });

    it("on valid data, does not disturb its validator", () => {
      const body = tree.getElementsByTagName("body")[0];
      const container = body.parentNode!;
      const index = _indexOf.call(container.childNodes, body);
      const ret = p.speculativelyValidate(container, index, body);
      assert.isFalse(ret);
      assert.equal(p.errors.length, 0,
                   "no errors after speculativelyValidate");

      p.restartAt(container);
      (p as any)._validateUpTo(container, -1);
      assert.equal(p.errors.length, 0,
                   "no errors after subsequent validation");
    });

    it("on invalid data, does not disturb its validator", () => {
      const body = tree.getElementsByTagName("body")[0];
      const container = body.parentNode!;
      const index = _indexOf.call(container.childNodes, body);
      const em = tree.getElementsByTagName("em")[0];
      const ret = p.speculativelyValidate(container, index, em);
      if (ret instanceof Array) {
        assert.equal(ret.length, 1, "the fragment is invalid");
        // No errors after.
        assert.equal(p.errors.length, 0,
                     "no errors after speculativelyValidate");

        p.restartAt(container);
        (p as any)._validateUpTo(container, -1);
        // Does not cause subsequent errors when the validator validates.
        assert.equal(p.errors.length, 0,
                     "no errors after subsequent validation");
      }
      else {
        fail("ret is not an array");
      }
    });

    // An early bug would cause this case to get into an infinite loop.
    it("works fine if the data to validate is only text", () => {
      const container = tree.getElementsByTagName("em")[0];
      const toParse = container.ownerDocument!.createTextNode("data");
      const ret = p.speculativelyValidate(container, 0, toParse);
      assert.isFalse(ret, "fragment is valid");
    });
  });

  // speculativelyValidateFragment is largely tested through
  // speculativelyValidate above.
  describe("speculativelyValidateFragment", () => {
    let p: Validator;
    let tree: Document;

    before(() => {
      tree = genericTree.cloneNode(true) as Document;
      p = new Validator(grammar, tree, {
        maxTimespan: 0, // Work forever.
      });
    });

    it("throws an error if toParse is not an element", () => {
      const body = tree.getElementsByTagName("body")[0];
      const container = body.parentNode!;
      const index = _indexOf.call(container.childNodes, body);
      assert.throws(p.speculativelyValidateFragment.bind(
        p, container, index, document.createTextNode("blah") as any),
                    Error, "toParse is not an element");
    });
  });

  describe("getDocumentNamespaces", () => {
    let p: Validator;
    let tree: Document;
    const toParseStack: string[] = [];
    beforeEach(
      () => util.fetchText(toParseStack[0])
        .then((data) => {
          tree = parser.parse(data);
          p = new Validator(grammar, tree, {
            maxTimespan: 0, // Work forever.
          });
        }));

    describe("simple document", () => {
      before(() => {
        toParseStack.unshift(
          testFile("getDocumentNamespaces1_to_parse_converted.xml"));
      });

      after(() => {
        toParseStack.shift();
      });

      it("returns the namespaces", () => {
        assert.deepEqual(p.getDocumentNamespaces(),
                         // tslint:disable-next-line: no-http-string
                         { "": ["http://www.tei-c.org/ns/1.0"] });
      });
    });

    describe("document with redefined namespaces", () => {
      before(() => {
        toParseStack.unshift(
          testFile("getDocumentNamespaces_redefined_to_parse_converted.xml"));
      });

      after(() => {
        toParseStack.shift();
      });

      it("returns the namespaces", () => {
        assert.deepEqual(p.getDocumentNamespaces(), {
          // tslint:disable-next-line: no-http-string
          "": ["http://www.tei-c.org/ns/1.0"],
          x: ["uri:x", "uri:x2"],
        });
      });
    });
  });

  describe("getErrorsFor", () => {
    function makeTest(name: string,
                      preFn: undefined | ((tree: Document) => void),
                      stopFn: (p: Validator, tree: Document) => void): void {
      it(name, (done) => {
        const tree = genericTree.cloneNode(true) as Document;
        if (preFn !== undefined) {
          preFn(tree);
        }

        const p = new Validator(grammar, tree, {
          maxTimespan: 0, // Work forever.
        });
        onCompletion(p, () => {
          stopFn(p, tree);
          done();
        });
        p.start();
      });
    }

    makeTest("with actual contents, no errors", undefined,
             (p, tree) => {
               assert.equal(p.errors.length, 0, "no errors");
               assert.sameMembers(
                 p.getErrorsFor(tree.getElementsByTagName("em")[0]),
                 []);
             });

    makeTest("with actual contents, errors in the tag examined",
             (tree) => {
               const el = tree.getElementsByTagName("em")[0];
               el.appendChild(el.ownerDocument!.createElement("foo"));
             },
             (p, tree) => {
               const errors =
                 p.getErrorsFor(tree.getElementsByTagName("em")[0]);
               assert.equal(errors.length, 1);
               assert.equal(
                 errors[0].error.toString(),
                 "tag not allowed here: {\"ns\":\"\",\"name\":\"foo\"}");
             });

    makeTest("with actual contents, errors but not in the tag examined",
             (tree) => {
               const el = tree.getElementsByTagName("em")[0];
               el.appendChild(el.ownerDocument!.createElement("foo"));
             },
             (p, tree) => {
               const errors =
                 p.getErrorsFor(tree.getElementsByTagName("em")[1]);
               assert.equal(errors.length, 0);
             });
  });

  describe("resolveNameAt/unresolveNameAt", () => {
    let p: Validator;
    let tree: Document;
    before(
      () => util.fetchText(testFile("resolve_unresolve_names_converted.xml"))
        .then((data) => {
          tree = parser.parse(data);
          p = new Validator(grammar, tree, {
            maxTimespan: 0, // Work forever.
          });
        }));

    describe("resolveNameAt", () => {
      it("at root", () => {
        const tei = tree.getElementsByTagName("TEI")[0];
        assert.deepEqual(p.resolveNameAt(tei, 0, "teiHeader"),
                         // tslint:disable-next-line:no-http-string
                         new EName("http://www.tei-c.org/ns/1.0", "teiHeader"));
        // Attribute.
        assert.deepEqual(p.resolveNameAt(tei, 0, "teiHeader", true),
                         new EName("", "teiHeader"));
        assert.deepEqual(p.resolveNameAt(tei, 0, "foo:teiHeader"),
                         new EName("fooURI", "teiHeader"));
      });

      it("in element that changes mappings", () => {
        const body = tree.getElementsByTagName("body")[0];
        assert.deepEqual(p.resolveNameAt(body, 0, "teiHeader"),
                         // tslint:disable-next-line:no-http-string
                         new EName("http://www.tei-c.org/ns/1.0", "teiHeader"));
        assert.deepEqual(p.resolveNameAt(body, 0, "foo:teiHeader"),
                         new EName("changed", "teiHeader"));
      });
    });

    describe("unresolveNameAt", () => {
      it("at root", () => {
        const tei = tree.getElementsByTagName("TEI")[0];
        // tslint:disable-next-line:no-http-string
        assert.equal(p.unresolveNameAt(tei, 0, "http://www.tei-c.org/ns/1.0",
                                       "teiHeader"),
                     "teiHeader");
        assert.equal(p.unresolveNameAt(tei, 0, "fooURI", "teiHeader"),
                     "foo:teiHeader");
      });

      it("in element that changes mappings", () => {
        const body = tree.getElementsByTagName("body")[0];
        // tslint:disable-next-line:no-http-string
        assert.equal(p.unresolveNameAt(body, 0, "http://www.tei-c.org/ns/1.0",
                                       "teiHeader"),
                     "teiHeader");
        assert.equal(p.unresolveNameAt(body, 0, "changed", "teiHeader"),
                     "foo:teiHeader");
      });
    });
  });
});

describe("safeParse", () => {
  it("reports errors", () => {
    assert.throws(() => safeParse("<>"), ParsingError);
  });

  it("reports errors on partial documents", () => {
    assert.throws(() => safeParse("<moo>"), ParsingError);
  });

  it("parses", () => {
    const doc = safeParse("<div/>");
    assert.isNotNull(doc.firstChild);
  });
});

//  LocalWords:  enterStartTag html jQuery Dubeau MPL Mangalam config
//  LocalWords:  RequireJS requirejs subdirectory validator jquery js
//  LocalWords:  chai baseUrl rng

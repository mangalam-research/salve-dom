/**
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
import "chai";
import "mocha";

// tslint:disable-next-line:no-submodule-imports no-implicit-dependencies
import { EventEmitter } from "dist/lib/event_emitter";

const assert = chai.assert;

interface Data {
  prop: number;
}

interface Events {
  "event": Data;
  "a": number;
  "b": number;
  "event 1": number;
  "event 2": number;
  "*": Data | number;
}

describe("EventEmitter", () => {
  let emitter: EventEmitter<Events>;

  beforeEach(() => {
    emitter = new EventEmitter<Events>();
  });

  describe("addEventListener", () => {
    it("adds an event listener", () => {
      let called = false;
      emitter.addEventListener("event", () => {
        called = true;
      });
      emitter._emit("event", { prop: 1});
      assert.isTrue(called);
    });

    it("adds event listener in order", () => {
      const calls: string[] = [];
      emitter.addEventListener("event", () => {
        calls.push("first");
      });
      emitter.addEventListener("event", () => {
        calls.push("second");
      });

      emitter._emit("event", { prop: 1});
      assert.deepEqual(calls, ["first", "second"]);
    });
  });

  describe("_emit", () => {
    it("works fine if emitting an event for which there is no handler", () => {
      assert.doesNotThrow(emitter._emit.bind(emitter, "event", { prop: 1}));
    });

    it("does not continue processing if a listener returns false", () => {
      const calls: string[] = [];
      emitter.addEventListener("event", () => {
        calls.push("first");

        return false;
      });
      emitter.addEventListener("event", () => {
        calls.push("second");
      });

      emitter._emit("event", { prop: 1});
      assert.deepEqual(calls, ["first"]);
    });

    it("passes event data", () => {
      let data;
      emitter.addEventListener("event", (ev: any) => {
        data = ev;
      });
      const expectedEv = { prop: 1 };
      emitter._emit("event", expectedEv);
      assert.deepEqual(data, expectedEv);
    });

    it("calls only relevant listeners", () => {
      const calls: string[] = [];
      emitter.addEventListener("event 1", () => {
        calls.push("event 1");
      });
      emitter.addEventListener("event 2", () => {
        calls.push("event 2");
      });

      emitter._emit("event 1", 1);
      // event 2 not present so the 2nd handler was not called.
      assert.deepEqual(calls, ["event 1"]);
    });

    it("calls one-time listeners as many times as they've been added", () => {
      const calls: string[] = [];
      function listener(): void {
        calls.push("event");
      }
      emitter.addOneTimeEventListener("event", listener);
      emitter.addOneTimeEventListener("event", listener);
      const ret = emitter.addOneTimeEventListener("event", listener);
      emitter.removeEventListener("event", ret);
      emitter._emit("event", { prop: 1});
      assert.deepEqual(calls, ["event", "event"]);
    });

    it("processes generic listeners first", () => {
      // The generic_listener will execute but not the regular listener.
      const executed: string[] = [];
      function generic_listener(name: string): false {
        executed.push(name);

        return false;
      }
      let listenerExecuted = false;
      function listener(): void {
        listenerExecuted = true;
      }
      const eventName = "a";
      emitter.addEventListener(eventName, listener);
      emitter.addEventListener("*", generic_listener);
      emitter._emit(eventName, 1);
      assert.isFalse(listenerExecuted);
      assert.equal(executed[0], eventName);
    });

    it("calls generic listeners", () => {
      const expect = [
        ["a", 2],
        ["b", 1],
      ];
      let expectIx = 0;
      function listener(name: string, ev: any): void {
        const expected = expect[expectIx++];
        assert.equal(name, expected[0]);
        assert.equal(ev, expected[1]);
      }
      emitter.addEventListener("*", listener);
      emitter._emit("a", 2);
      emitter._emit("b", 1);
    });
  });

  describe("removeEventListener", () => {
    it("does nothing if the listener is not present among those added", () => {
      assert.doesNotThrow(
        // tslint:disable-next-line: no-empty
        emitter.removeEventListener.bind(emitter, "event", () => {}));
    });

    it("removes a listener that was added", () => {
      const calls: string[] = [];
      function listener(): void {
        calls.push("event 1");
      }
      emitter.addEventListener("event 1", listener);
      emitter._emit("event 1", 1);
      assert.deepEqual(calls, ["event 1"]);

      // Remove the listener, so emitting again won't change the list of calls.
      emitter.removeEventListener("event 1", listener);
      emitter._emit("event 1", 1);
      assert.deepEqual(calls, ["event 1"]);
    });

    it("removes a listener only once", () => {
      const calls: string[] = [];
      function listener(): void {
        calls.push("event 1");
      }
      emitter.addEventListener("event 1", listener);
      emitter.addEventListener("event 1", listener);
      emitter._emit("event 1", 1);
      assert.deepEqual(calls, ["event 1", "event 1"]);

      // Remove the listener, so one listener is left.
      emitter.removeEventListener("event 1", listener);
      emitter._emit("event 1", 1);
      // And we get one more element to our array.
      assert.deepEqual(calls, ["event 1", "event 1", "event 1"]);
    });
  });

  describe("removeAllListeners", () => {
    it("removes only the listeners related to a specific event", () => {
      const calls: string[] = [];
      emitter.addEventListener("event 1", () => {
        calls.push("event 1");
      });
      emitter.addEventListener("event 2", () => {
        calls.push("event 2");
      });

      emitter._emit("event 1", 1);
      emitter._emit("event 2", 1);
      assert.deepEqual(calls, ["event 1", "event 2"]);
      emitter.removeAllListeners("event 1");
      emitter._emit("event 1", 1);
      emitter._emit("event 2", 1);
      assert.deepEqual(calls, ["event 1", "event 2", "event 2"]);
    });

    it("removes all event listener for a specific event", () => {
      const calls: string[] = [];
      emitter.addEventListener("event 1", () => {
        calls.push("event 1");
      });
      emitter.addEventListener("event 1", () => {
        calls.push("event 1.b");
      });
      emitter._emit("event 1", 1);
      assert.deepEqual(calls, ["event 1", "event 1.b"]);
      emitter.removeAllListeners("event 1");
      emitter._emit("event 1", 1);
      assert.deepEqual(calls, ["event 1", "event 1.b"]);
    });
  });

  describe("addOneTimeEventListener", () => {
    it("adds an event listener called only once", () => {
      const calls: string[] = [];
      emitter.addOneTimeEventListener("event", () => {
        calls.push("event");
      });
      emitter._emit("event", { prop: 1});
      assert.deepEqual(calls, ["event"]);
      emitter._emit("event", { prop: 1});
      assert.deepEqual(calls, ["event"]);
    });

    it("adds a general event listener called only once", () => {
      const calls: [string, any][] = [];
      emitter.addOneTimeEventListener("*", (name: string, data: any) => {
        calls.push([name, data]);
      });
      emitter._emit("event", { prop: 1});
      assert.deepEqual(calls, [["event", { prop: 1 }]]);
      emitter._emit("event", { prop: 1});
      assert.deepEqual(calls, [["event", { prop: 1 }]]);
    });

    it("returns a value that can be used by removeEventListener", () => {
      const calls: string[] = [];
      const ret = emitter.addOneTimeEventListener("event", () => {
        calls.push("event a");
      });
      emitter.addOneTimeEventListener("event", () => {
        calls.push("event b");
      });
      emitter.removeEventListener("event", ret);

      emitter._emit("event", { prop: 1});
      assert.deepEqual(calls, ["event b"]);
    });
  });
});

//  LocalWords:  addOneTimeEventListener removeAllListeners chai oop
//  LocalWords:  removeEventListener addEventListener requirejs
//  LocalWords:  SimpleEventEmitter

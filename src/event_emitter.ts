/**
 * A listener class.
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */

export type Listener<T> = (ev: T) => (boolean | void);

export type StringKeys<T> = Extract<keyof T, string>;

/**
 * A map of event name to listener array.
 */
type SpecializedMap<Events> = {
  [P in StringKeys<Events>]: Listener<Events[P]>[];
};

/**
 * A listener for listening on the "*" event: the ``ev`` parameter accepts the
 * union of all possible event types defined in the ``Events`` map.
 */
export type GeneralListener<Events> =
  (name: string, ev: Events[keyof Events]) => (boolean | void);

/**
 * This is an interface that can be used to hide the ``_emit`` method.
 */
export interface Consuming<Events> {
  addEventListener<T extends StringKeys<Events>>(
    eventName: T, listener: Listener<Events[T]>): void;
  addEventListener(
    eventName: "*", listener: GeneralListener<Events>): void;

  addOneTimeEventListener<T extends StringKeys<Events>>(
    eventName: T,
    listener: Listener<Events[T]>): any;
  addOneTimeEventListener(
    eventName: "*",
    listener: GeneralListener<Events>): any;

  removeEventListener<T extends StringKeys<Events>>(
    eventName: T, listener: Listener<Events[T]>): void;
  removeEventListener(
    eventName: "*", listener: GeneralListener<Events>): void;

  removeAllListeners<T extends StringKeys<Events>>(eventName: T): void;
  removeAllListeners(eventName: "*"): void;
}

/**
 * The ``Event`` parameter passed to the class must be an interface that maps
 * event names to the type of data that the event subscribers will get.
 *
 *     interface Events {
 *       "foo": FooData,
 *       "bar": BarData,
 *     }
 *
 * The code that wishes to emit an event calls ``_emit`` to emit events. For
 * instance, if ``_emit("foo", {beep: 3})`` is called, this will result in all
 * listeners on event ``"foo"`` being called and passed the object ``{beep:
 * 3}``. Any listener returning the value ``false`` ends the processing of the
 * event.
 *
 * This class also supports listening on events in a generic way, by listening
 * to the event named "\*". Listeners on such events have the signature
 * ``listener(name, ev)``. When the ``_emit`` call above is executed such
 * listener will be called with ``name`` set to ``"foo"`` and ``ev`` set to
 * ``{beep: 3}``. Listeners on "\*" are executed before the other
 * listeners. Therefore, if they return the value ``false``, they prevent the
 * other listeners from executing.
 */
export class EventEmitter<Events> implements Consuming<Events> {
  private _eventListeners: SpecializedMap<Events> = Object.create(null);
  private _generalListeners: GeneralListener<Events>[] = [];
  private _trace: boolean = false;

  /**
   * Adds a listener for an event. The order in which event listeners are
   * added matters. An earlier event listener returning ``false`` will prevent
   * later listeners from being called.
   *
   * @param eventName The name of the event to listen to.
   *
   * @param listener The function that will be called when
   * the event occurs.
   */
  addEventListener<T extends StringKeys<Events>>(
    eventName: T, listener: Listener<Events[T]>): void;
  addEventListener(
    eventName: "*", listener: GeneralListener<Events>): void;
  addEventListener<T extends StringKeys<Events>>(
    eventName: "*" | T,
    listener: Listener<Events[T]> | GeneralListener<Events>): void {
    if (eventName === "*") {
      this._generalListeners.push(listener as GeneralListener<Events>);
    }
    else {
      let listeners = this._eventListeners[eventName];
      if (listeners === undefined) {
        listeners = this._eventListeners[eventName] = [];
      }
      listeners.push(listener as Listener<Events[T]>);
    }
  }

  /**
   * Adds a one-time listener for an event. The listener will be called only
   * once. If this method is called more than once with the same listener, the
   * listener will be called for each call made to this method. The order in
   * which event listeners are added matters. An earlier event listener
   * returning ``false`` will prevent later listeners from being called.
   *
   * @param eventName The name of the event to listen to.
   *
   * @param listener The function that will be called when the event occurs.
   *
   * @returns This method returns an opaque identifier which uniquely
   * identifies this addition operation. If the caller ever wants to undo this
   * addition at a later time using [[removeEventListener]], it can pass this
   * return value as the listener to remove. (Client code peeking at the
   * return value and relying on what it finds does so at its own risk. The
   * way the identifier is created could change in future versions of this
   * code.)
   */
  addOneTimeEventListener<T extends StringKeys<Events>>(
    eventName: T,
    listener: Listener<Events[T]>): any;
  addOneTimeEventListener(
    eventName: "*",
    listener: GeneralListener<Events>): any;
  addOneTimeEventListener<T extends StringKeys<Events>>(
    eventName: "*" | T,
    listener: Listener<Events[T]> | GeneralListener<Events>): any {
    // We perform casts as any here to indicate to TypeScript that it is
    // safe to pass this stub.
    const me = (...args: any[]) => {
      this.removeEventListener(eventName as any, me);

      return (listener as any).apply(this, args);
    };

    this.addEventListener(eventName as any, me);

    return me;
  }

  /**
   * Removes a listener. Calling this method on a listener that is not
   * actually listening to events is a noop.
   *
   * @param eventName The name of the event that was listened to.
   *
   * @param listener The handler to remove.
   */
  removeEventListener<T extends StringKeys<Events>>(
    eventName: T, listener: Listener<Events[T]>): void;
  removeEventListener(
    eventName: "*", listener: GeneralListener<Events>): void;
  removeEventListener<T extends StringKeys<Events>>(
    eventName: "*" | T,
    listener: Listener<Events[T]> | GeneralListener<Events>): void {
    const listeners = (eventName === "*") ?
      this._generalListeners :
      this._eventListeners[eventName];

    if (listeners === undefined) {
      return;
    }

    const index = (listeners as any[]).lastIndexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Removes all listeners for a specific event.
   *
   * @param eventName The event whose listeners must all be removed.
   */
  removeAllListeners<T extends StringKeys<Events>>(
    eventName: T): void;
  removeAllListeners(eventName: "*"): void;
  removeAllListeners<T extends StringKeys<Events>>(eventName: "*" | T): void {
    if (eventName === "*") {
      this._generalListeners = [];
    }
    else {
      this._eventListeners[eventName] = [];
    }
  }

  /**
   * This is the function that must be called to indicate that an event has
   * occurred.
   *
   * @param eventName The name of the event to emit.
   *
   * @param ev The event data to provide to handlers. The type can be
   * anything.
   */
  public _emit<T extends StringKeys<Events>>(eventName: T,
                                             ev: Events[T]): void {
    if (this._trace) {
      // tslint:disable-next-line: no-console
      console.log("simple_event_emitter emitting:", eventName, "with:", ev);
    }

    {
      let listeners = this._generalListeners;
      if (listeners.length > 0) {
        // We take a copy so that if any of the handlers add or remove
        // listeners, they don't disturb our work here.
        listeners = listeners.slice();

        for (const listener of listeners) {
          const ret = listener.call(undefined, eventName, ev);
          if (ret === false) {
            return;
          }
        }
      }
    }

    {
      let listeners = this._eventListeners[eventName];
      if (listeners !== undefined && listeners.length > 0) {
        // We take a copy so that if any of the handlers add or remove
        // listeners, they don't disturb our work here.
        listeners = listeners.slice();

        for (const listener of listeners) {
          const ret = listener.call(undefined, ev);
          if (ret === false) {
            return;
          }
        }
      }
    }
  }
}
//  LocalWords:  Mangalam MPL Dubeau noop ev

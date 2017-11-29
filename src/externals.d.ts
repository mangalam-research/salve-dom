/**
 * Fixes to the global object and external modules.
 */
interface Object {
  setPrototypeOf?: (obj: any, proto: Function) => void;
}

interface Window {
  DOMParser: typeof DOMParser;
}

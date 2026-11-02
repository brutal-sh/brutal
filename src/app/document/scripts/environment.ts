/** Executes inside QuickJS; none of these values or functions is a host handle. */
export const SCRIPT_ENVIRONMENT = String.raw`(() => {
  const stringify = JSON.stringify;
  const keys = Object.keys;
  const create = Object.create;
  const setPrototypeOf = Object.setPrototypeOf;
  const getPrototypeOf = Object.getPrototypeOf;
  const objectPrototype = Object.prototype;
  const isArray = Array.isArray;
  const isFinite = Number.isFinite;
  function snapshot(value) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value !== 'object' || (!isArray(value) && getPrototypeOf(value) !== objectPrototype && getPrototypeOf(value) !== null))
      throw new TypeError('Script output must contain plain structured data only.');
    const result = isArray(value) ? setPrototypeOf([], null) : create(null);
    if (isArray(value)) {
      const length = value.length;
      for (let index = 0; index < length; index++) result[index] = snapshot(value[index]);
    } else {
      const names = keys(value);
      for (let index = 0; index < names.length; index++) result[names[index]] = snapshot(value[names[index]]);
    }
    return result;
  }
  let seed = 0;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  globalThis.self = globalThis;
  for (const callable of [function(){}, async function(){}, function*(){}, async function*(){}])
    Object.defineProperty(Object.getPrototypeOf(callable), 'constructor', {value: undefined});
  globalThis.Function = undefined;
  globalThis.eval = undefined;
  globalThis.Promise = undefined;
  Array.fromAsync = undefined;
  return value => {
    // Read once into plain snapshots so getters and toJSON cannot change validated data.
    return stringify(snapshot(value));
  };
})()`

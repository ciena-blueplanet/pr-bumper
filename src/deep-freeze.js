/**
 * @noflow
 */

/* eslint-disable flowtype/require-parameter-type */

/**
 * Deep freeze an object so it can't be mutated.
 * @param {*} object - object to deep freeze
 * @returns {*} deeply frozen object
 */
export default function deepFreeze (object) {
  if (Array.isArray(object)) {
    return Object.freeze(
      object.map(item => deepFreeze(item))
    )
  } else if (typeof object === 'object' && object !== null) {
    return Object.freeze(
      Object.keys(object).reduce(
        (obj, key) => {
          return Object.assign(obj, {
            // $FlowFixMe - Flow will complain about accessing computed property
            [key]: deepFreeze(object[key])
          })
        },
        {}
      )
    )
  }

  return object
}

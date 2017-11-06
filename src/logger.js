/**
 * @flow
 */

const pkgJson = require('../package.json')

function getMessage (data: Error | string) {
  return data instanceof Error ? data.toString() : data
}

export default {
  /**
   * Simple wrapper around console.log() to make it easy to mock it out in tests
   * @param {Error|String} data - the error/message to log
   * @param {Boolean|String} forceOrMessage - force logging boolean or additional message to log
   * @param {Boolean} [force] - when true, log message even if VERBOSE is not set
   */
  log (data: Error | string, forceOrMessage?: boolean | string, force?: boolean): void {
    let additionalMessage: ?string = null

    switch (typeof forceOrMessage) {
      case 'string':
        additionalMessage = forceOrMessage
        break

      default:
        force = forceOrMessage
        break
    }

    if (force || process.env['VERBOSE']) {
      const message = getMessage(data)
      const args = [`${pkgJson.name}: ${message}`]

      if (additionalMessage) {
        args.push(additionalMessage)
      }

      console.log(...args)
    }
  },

  /**
   * Simple wrapper around console.error() to make it easy to mock it out in tests
   * @param {Error|String} data - the error/message to log
   * @param {Error} error - error to log
   */
  error (data: Error | string, error?: Error): void {
    const message = getMessage(data)
    const args = [`${pkgJson.name}: ${message}`]

    if (error) {
      args.push(error)
    }

    console.error(...args)
  }
}

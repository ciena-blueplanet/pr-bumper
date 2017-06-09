'use strict'

const pkgJson = require('../package.json')

const logger = {
  /**
   * Simple wrapper around console.log() to make it easy to mock it out in tests
   * @param {String} msg - the message to log
   * @param {Boolean} [force] - when true, log message even if VERBOSE is not set
   */
  log (msg, force) {
    if (force || process.env['VERBOSE']) {
      console.log(`${pkgJson.name}: ${msg}`)
    }
  },

  /**
   * Simple wrapper around console.error() to make it easy to mock it out in tests
   * @param {String} msg - the message to log
   */
  error (msg) {
    console.error(`${pkgJson.name}: ${msg}`)
  }
}

module.exports = logger

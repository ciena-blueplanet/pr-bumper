'use strict'

const pkgJson = require('../package.json')

const logger = {
  /**
   * Simple wrapper around console.log() to make it easy to mock it out in tests
   * @param {String} msg - the message to log
   */
  log (msg) {
    // TODO: check a VERBOSE env var
    console.log(`${pkgJson.name}: ${msg}`)
  },

  /**
   * Simple wrapper around console.log() to make it easy to mock it out in tests
   * @param {String} msg - the message to log
   */
  error (msg) {
    // TODO: ignore a VERBOSE env var
    console.error(`${pkgJson.name}: ${msg}`)
  }
}

module.exports = logger

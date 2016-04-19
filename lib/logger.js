'use strict'

const logger = {
  /**
   * Simple wrapper around console.log() to make it easy to mock it out in tests
   * @param {String} msg - the message to log
   */
  log (msg) {
    console.log(msg)
  }
}

module.exports = logger

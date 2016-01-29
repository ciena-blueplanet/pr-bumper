'use strict'

require('./typedefs')

const utils = require('./utils')

/**
 * Interacts with a Vcs to achieive a version bump
 * @class
 */
class Bumper {

  /**
   * @param {Vcs} vcs - the vcs instance to use
   */
  constructor (vcs) {
    this.vcs = vcs
  }

  /**
   * Get the pr scope for the current (open) pull request
   * @returns {Promise} a promise - resolved with a String scope of the PR or rejected if no valid scope found
   */
  getOpenPrScope () {
    const vcs = this.vcs
    return utils.getSha()
      .then((sha) => {
        return vcs.getOpenPrForSha(sha)
      })
      .then((pr) => {
        return utils.getScopeForPr(pr)
      })
  }

  /**
   * Get the PR scope for the current (merged) pull request
   * @returns {Promise} a promise - resolved with a String scope of the PR or rejected if no valid scope found
   */
  getMergedPrScope () {
    const vcs = this.vcs
    return utils.getSha()
      .then((sha) => {
        return vcs.getClosedPrForSha(sha)
      })
      .then((pr) => {
        return utils.getScopeForPr(pr)
      })
  }
}

module.exports = Bumper

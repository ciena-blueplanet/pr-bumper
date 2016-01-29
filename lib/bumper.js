'use strict'

require('./typedefs')

const Promise = require('promise')
const pkgJson = require('../package.json')
const utils = require('./utils')

/**
 * Interacts with a Vcs to achieive a version bump
 * @class
 */
class Bumper {

  /**
   * @param {Vcs} vcs - the vcs instance to use
   * @param {Config} config - the bumper config object
   */
  constructor (vcs, config) {
    this.vcs = vcs
    this.config = config
  }

  /**
   * Check a PR for a version-bump comment
   * @returns {Promise} a promise resolved when complete or rejected on error
   */
  check () {
    if (!this.config.isPr) {
      console.log(`${pkgJson.name}:  Not a PR build, skipping check`)
      return Promise.resolve()
    } else {
      return this.getOpenPrScope()
        .then((scope) => {
          console.log(`Found a ${scope} bump for the current PR`)
        })
    }
  }

  bump () {
    const vcs = this.vcs
    const config = this.config
    return this.getMergedPrScope()
      .then((scope) => {
        return utils.bumpVersion(scope)
      })
      .then(() => {
        return utils.commitChanges(config)
      })
      .then(() => {
        return vcs.push()
      })
  }

  /**
   * Get the pr scope for the current (open) pull request
   * @returns {Promise} a promise - resolved with a String scope of the PR or rejected if no valid scope found
   */
  getOpenPrScope () {
    const vcs = this.vcs
    return utils.getSha(this.config)
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
    return utils.getSha(this.config)
      .then((sha) => {
        return vcs.getClosedPrForSha(sha)
      })
      .then((pr) => {
        return utils.getScopeForPr(pr)
      })
  }
}

module.exports = Bumper

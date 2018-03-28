'use strict'

require('../typedefs')

const Promise = require('promise')
const cpExec = require('child_process').exec

// This is not `const` so it can be re-wired during tests
let exec = Promise.denodeify(cpExec)

const CiBase = require('./base')
const logger = require('../logger')

/**
 * CI interface for public Travis (travis-ci.org)
 *
 * @class
 * @implements {Ci}
 */
class Travis extends CiBase {
  /**
   * Push local changes to GitHub
   * @returns {Promise} a promise resolved with the result of the push
   */
  push () {
    const branch = this.config.computed.ci.branch
    return this.vcs.addRemoteForPush()
      .then((remoteName) => {
        logger.log(`Pushing ci-${branch} to ${remoteName}`)
        return exec(`git push ${remoteName} ci-${branch}:refs/heads/${branch} --tags`)
      })
  }

  /**
   * Prepare the git env within travis-ci
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  setupGitEnv () {
    const branch = this.config.computed.ci.branch
    return super.setupGitEnv()
      .then(() => {
        return exec(`git checkout -b ci-${branch}`)
      })
  }
}

module.exports = Travis

'use strict'

require('../typedefs')

const Promise = require('promise')
const cpExec = require('child_process').exec

// This is not `const` so it can be re-wired during tests
let exec = Promise.denodeify(cpExec)

const logger = require('../logger')

/**
 * Base CI implementation to provide basic git functionality
 *
 * @class
 * @implements {Ci}
 */
class CiBase {
  /**
   * @param {Config} config - the configuration object
   * @param {Vcs} vcs - the vcs system being used
   */
  constructor (config, vcs) {
    this.config = config
    this.vcs = vcs
  }

  /**
   * Add changed files
   *
   * @param {String[]} files - the files to add
   * @returns {Promise} - a promise resolved with result of git commands
   */
  add (files) {
    return exec(`git add ${files.join(' ')}`)
  }

  /**
   * Commit local changes
   *
   * @param {String} summary - the git commit summary
   * @param {String} message - the detailed commit message
   * @returns {Promise} - a promise resolved with result of git commands
   */
  commit (summary, message) {
    return exec(`git commit -m "${summary}" -m "${message}"`)
  }

  /**
   * Get the most recent commit message summary
   *
   * @returns {Promise} - a promise resolved with result of git command
   */
  getLastCommitMsg () {
    return exec('git log --pretty=format:\'%s\' -1')
  }

  /**
   * Push local changes to remote repo
   * @returns {Promise} a promise resolved with the result of the push
   */
  push () {
    return this.vcs.addRemoteForPush().then((remoteName) => {
      const branch = this.config.computed.ci.branch
      logger.log(`Pushing ${branch} to ${remoteName}`)
      return exec(`git push ${remoteName} ${branch} --tags`)
    })
  }

  /**
   * Prepare the git env (setting the user properly)
   * @returns {Promise} - a promise resolved with the results of the git commands
   */
  setupGitEnv () {
    const user = this.config.ci.gitUser
    return exec(`git config --global user.email "${user.email}"`)
      .then(() => {
        return exec(`git config --global user.name "${user.name}"`)
      })
  }

  /**
   * Create a local tag
   *
   * @param {String} name - the name of the tag to create
   * @param {String} message - commit message of the tag being created
   * @returns {Promise} - a promise resolved with result of git commands
   */
  tag (name, message) {
    return exec(`git tag ${name} -a -m "${message}"`)
  }
}

module.exports = CiBase
